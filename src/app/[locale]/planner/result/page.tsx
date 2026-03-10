"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";

import { SiteHeader } from "../../../../components/site-header";
import { loadDestinationsWithVersion } from "../../../../lib/data/load-destinations";
import { normalizeDestinations } from "../../../../lib/data/normalize-destinations";
import { resolveLocale } from "../../../../lib/i18n/config";
import {
  formatDecimal,
  formatMessage,
  formatNumber,
  formatTicketCost,
  getBudgetLabel,
  getMessages,
  getMonthLabel,
  getTravelIntensityLabel
} from "../../../../lib/i18n/messages";
import { rankCandidatesForPlanner } from "../../../../lib/planner/candidate-ranking";
import { assembleFinalItinerary } from "../../../../lib/planner/final-itinerary";
import { generateIntraRegionDayPlans } from "../../../../lib/planner/intra-region-routing";
import { allocateTripDaysAcrossRegions } from "../../../../lib/planner/region-allocation";
import {
  clearPersistedItinerary,
  deriveCostBreakdown,
  readPersistedCostBreakdown,
  readPersistedItinerary,
  writePersistedCostBreakdown,
  writePersistedItinerary
} from "../../../../lib/persistence/itinerary";
import { readSavedInterestSlugs } from "../../../../lib/persistence/interests";
import type { PlannerDraft } from "../../../../lib/persistence/planner-draft";
import {
  clearPlannerDraft,
  defaultPlannerDraft,
  readPlannerDraft
} from "../../../../lib/persistence/planner-draft";
import type { Locale } from "../../../../types/dataset";

const ItineraryMapClient = dynamic(
  () => import("../../../../components/maps/itinerary-map.client"),
  { ssr: false }
);

function getCrowdLabel(crowdLevel: number, locale: Locale): string {
  const messages = getMessages(locale);
  if (crowdLevel <= 1) return messages.plannerResult.crowdLow;
  if (crowdLevel === 2) return messages.plannerResult.crowdModerate;
  if (crowdLevel === 3) return messages.plannerResult.crowdBusy;
  if (crowdLevel === 4) return messages.plannerResult.crowdHigh;
  return messages.plannerResult.crowdPeak;
}

function getReasonExplanation(
  reasonCode: string | undefined,
  name: string,
  locale: Locale
): string {
  const messages = getMessages(locale);
  const template =
    reasonCode === "category_match"
      ? messages.plannerResult.reasonCategory
      : reasonCode === "season_match"
        ? messages.plannerResult.reasonSeason
        : reasonCode === "budget_match"
          ? messages.plannerResult.reasonBudget
          : reasonCode === "crowd_preference"
            ? messages.plannerResult.reasonCrowd
            : reasonCode === "duration_fit"
              ? messages.plannerResult.reasonDuration
              : messages.plannerResult.reasonFallback;

  return formatMessage(template, { name });
}

export default function PlannerResultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = use(params);
  const locale = resolveLocale(localeParam);
  const messages = getMessages(locale);
  const router = useRouter();
  const [draft, setDraft] = useState<PlannerDraft>(defaultPlannerDraft);
  const [savedInterestSlugs, setSavedInterestSlugs] = useState<string[]>([]);
  const [persistedAt, setPersistedAt] = useState("");
  const { datasetVersion, destinations } = useMemo(() => loadDestinationsWithVersion(), []);
  const normalizedDestinations = useMemo(
    () => normalizeDestinations(destinations, locale),
    [destinations, locale]
  );

  useEffect(() => {
    setDraft(readPlannerDraft());
    setSavedInterestSlugs(readSavedInterestSlugs());

    const persistedItinerary = readPersistedItinerary();
    if (persistedItinerary?.locale === locale) {
      setPersistedAt(persistedItinerary.savedAt);
    }
  }, [locale]);

  const ranking = useMemo(
    () =>
      rankCandidatesForPlanner({
        profile: {
          preferredCategories: draft.preferredCategories,
          tripDurationDays: draft.tripDurationDays,
          travelIntensity: draft.travelIntensity,
          budget: draft.budget,
          travelMonth: draft.travelMonth
        },
        destinations: normalizedDestinations,
        seedDestinationSlugs: savedInterestSlugs,
        datasetVersion
      }),
    [datasetVersion, draft, normalizedDestinations, savedInterestSlugs]
  );

  const regionAllocation = useMemo(() => allocateTripDaysAcrossRegions(ranking.handoff), [ranking]);
  const routingDayPlan = useMemo(
    () =>
      generateIntraRegionDayPlans({
        handoff: ranking.handoff,
        allocation: regionAllocation
      }),
    [ranking, regionAllocation]
  );

  const finalItinerary = useMemo(
    () =>
      assembleFinalItinerary({
        handoff: ranking.handoff,
        routing: routingDayPlan,
        destinations: normalizedDestinations
      }),
    [normalizedDestinations, ranking.handoff, routingDayPlan]
  );

  const currentCostBreakdown = useMemo(
    () => deriveCostBreakdown(finalItinerary, normalizedDestinations),
    [finalItinerary, normalizedDestinations]
  );
  const [persistedCostBreakdown, setPersistedCostBreakdown] = useState(currentCostBreakdown);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activeStopSlug, setActiveStopSlug] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date().toISOString();
    writePersistedItinerary({
      locale,
      datasetVersion,
      savedAt: now,
      itinerary: finalItinerary
    });
    writePersistedCostBreakdown(currentCostBreakdown);
    setPersistedAt(now);
    setPersistedCostBreakdown(currentCostBreakdown);
  }, [currentCostBreakdown, datasetVersion, finalItinerary, locale]);

  useEffect(() => {
    const savedBreakdown = readPersistedCostBreakdown();
    if (savedBreakdown) {
      setPersistedCostBreakdown(savedBreakdown);
    }
  }, []);

  useEffect(() => {
    const firstDay = finalItinerary.days[0];
    if (!firstDay) {
      setSelectedDayNumber(1);
      setActiveStopSlug(null);
      return;
    }

    setSelectedDayNumber((currentDayNumber) => {
      const dayExists = finalItinerary.days.some((day) => day.dayNumber === currentDayNumber);
      return dayExists ? currentDayNumber : firstDay.dayNumber;
    });
  }, [finalItinerary.days]);

  const selectedDay =
    finalItinerary.days.find((day) => day.dayNumber === selectedDayNumber) ?? finalItinerary.days[0];

  useEffect(() => {
    if (!selectedDay) {
      setActiveStopSlug(null);
      return;
    }

    setActiveStopSlug((currentSlug) => {
      if (currentSlug && selectedDay.stops.some((stop) => stop.slug === currentSlug)) {
        return currentSlug;
      }

      return selectedDay.stops[0]?.slug ?? null;
    });
  }, [selectedDay]);

  const itineraryMapDays = useMemo(
    () =>
      finalItinerary.days.map((day) => ({
        dayNumber: day.dayNumber,
        stops: day.stops.map((stop) => {
          const destination = normalizedDestinations.find((item) => item.slug === stop.slug);

          return {
            slug: stop.slug,
            name: stop.name[locale],
            lat: destination?.coordinates.lat ?? 0,
            lng: destination?.coordinates.lng ?? 0
          };
        })
      })),
    [finalItinerary.days, locale, normalizedDestinations]
  );

  const tripSnapshot = [
    { label: messages.plannerResult.days, value: formatNumber(draft.tripDurationDays, locale) },
    { label: messages.plannerResult.budget, value: getBudgetLabel(draft.budget, locale) },
    { label: messages.plannerResult.pace, value: getTravelIntensityLabel(draft.travelIntensity, locale) },
    { label: messages.plannerResult.travelMonth, value: getMonthLabel(draft.travelMonth, locale) },
    {
      label: messages.plannerResult.themesSelected,
      value: formatNumber(draft.preferredCategories.length, locale)
    },
    {
      label: messages.plannerResult.savedSeeds,
      value: formatNumber(savedInterestSlugs.length, locale)
    }
  ];

  const overviewStats = [
    {
      label: messages.plannerResult.itineraryDays,
      value: `${formatNumber(finalItinerary.totals.dayCount, locale)}/${formatNumber(finalItinerary.tripDays, locale)}`
    },
    {
      label: messages.plannerResult.totalStops,
      value: formatNumber(finalItinerary.totals.stopCount, locale)
    },
    {
      label: messages.plannerResult.totalVisitHours,
      value: formatDecimal(finalItinerary.totals.estimatedVisitHours, locale, 1)
    },
    {
      label: messages.plannerResult.totalTravelKm,
      value: formatDecimal(finalItinerary.totals.estimatedTravelKm, locale, 1)
    },
    {
      label: messages.plannerResult.unresolvedDays,
      value: formatNumber(finalItinerary.totals.unresolvedDayCount, locale)
    }
  ];

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />

        <section className="hero plannerResultHero">
          <span className="kicker">{messages.plannerResult.outputTitle}</span>
          <h1>{messages.plannerResult.title}</h1>
          <p>{messages.plannerResult.body}</p>
          <p className="plannerPersistedMeta">
            {messages.plannerResult.storageStatus}
            {persistedAt ? ` ${persistedAt}` : ""}
          </p>
        </section>

        <section className="plannerResultLayout">
          <aside className="plannerResultRail">
            <article className="card plannerPanel">
              <h2>{messages.plannerResult.preferencesTitle}</h2>
              <div className="plannerInfoStack">
                {tripSnapshot.map((item) => (
                  <div key={item.label} className="plannerInfoRow">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="card plannerPanel">
              <h2>{messages.plannerResult.costBreakdownTitle}</h2>
              <div className="plannerInfoStack">
                <div className="plannerInfoRow">
                  <span>{messages.plannerResult.costTotal}</span>
                  <strong>{formatTicketCost(persistedCostBreakdown.totalTicketCostOmr, locale)}</strong>
                </div>
                <div className="plannerInfoRow">
                  <span>{messages.plannerResult.costAverage}</span>
                  <strong>{formatTicketCost(persistedCostBreakdown.averageTicketCostPerDayOmr, locale)}</strong>
                </div>
                <div className="plannerInfoRow">
                  <span>{messages.plannerResult.costPaidStops}</span>
                  <strong>{formatNumber(persistedCostBreakdown.paidStopCount, locale)}</strong>
                </div>
                <div className="plannerInfoRow">
                  <span>{messages.plannerResult.costFreeStops}</span>
                  <strong>{formatNumber(persistedCostBreakdown.freeStopCount, locale)}</strong>
                </div>
              </div>
            </article>

            <article className="card plannerPanel">
              <h2>{messages.plannerResult.outputTitle}</h2>
              <div className="plannerMetricGrid">
                {overviewStats.map((item) => (
                  <div key={item.label} className="plannerMetric">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="card plannerMapCard">
              <div className="plannerMapCardHeader">
                <h2>{messages.plannerResult.mapTitle}</h2>
                <p>{messages.plannerResult.mapBody}</p>
              </div>
              <div className="plannerDayTabs" role="tablist" aria-label={messages.plannerResult.daySwitcherLabel}>
                {finalItinerary.days.map((day) => (
                  <button
                    key={`map-day-${day.dayNumber}`}
                    type="button"
                    role="tab"
                    aria-selected={day.dayNumber === selectedDayNumber}
                    className={day.dayNumber === selectedDayNumber ? "plannerDayTab plannerDayTabActive" : "plannerDayTab"}
                    onClick={() => {
                      setSelectedDayNumber(day.dayNumber);
                      setActiveStopSlug(day.stops[0]?.slug ?? null);
                    }}
                  >
                    {formatMessage(messages.plannerResult.dayTabLabel, {
                      dayNumber: formatNumber(day.dayNumber, locale)
                    })}
                  </button>
                ))}
              </div>
              <ItineraryMapClient
                days={itineraryMapDays}
                selectedDayNumber={selectedDayNumber}
                activeStopSlug={activeStopSlug}
                locale={locale}
                onActiveStopChange={setActiveStopSlug}
              />
              <div className="plannerLegend" aria-label={messages.plannerResult.mapLegendTitle}>
                <div className="plannerLegendItem">
                  <span className="plannerLegendSwatch plannerLegendSwatchRoute" aria-hidden="true" />
                  <span>{messages.plannerResult.mapLegendRoute}</span>
                </div>
                <div className="plannerLegendItem">
                  <span className="plannerLegendSwatch plannerLegendSwatchStop" aria-hidden="true" />
                  <span>{messages.plannerResult.mapLegendStop}</span>
                </div>
                <div className="plannerLegendItem">
                  <span className="plannerLegendSwatch plannerLegendSwatchActive" aria-hidden="true" />
                  <span>{messages.plannerResult.mapLegendActive}</span>
                </div>
              </div>
            </article>
          </aside>

          <section className="plannerResultMain">
            <div className="sectionCard">
              <h2>{messages.plannerResult.itineraryTitle}</h2>
            </div>

            <div className="plannerDayGrid">
              {selectedDay ? (() => {
                const day = selectedDay;
                const paidStopCount = day.stops.filter((stop) => stop.ticketCostOmr > 0).length;
                const freeStopCount = day.stops.length - paidStopCount;
                const highlightedStops = day.stops
                  .slice()
                  .sort((left, right) => {
                    if ((right.score ?? 0) !== (left.score ?? 0)) {
                      return (right.score ?? 0) - (left.score ?? 0);
                    }
                    if ((left.rank ?? Number.MAX_SAFE_INTEGER) !== (right.rank ?? Number.MAX_SAFE_INTEGER)) {
                      return (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
                    }
                    return left.slug.localeCompare(right.slug);
                  })
                  .slice(0, 2);

                return (
                  <article key={`planner-day-${day.dayNumber}`} className="card plannerDayCard">
                    <header className="plannerDayHeader">
                      <div>
                        <h3>
                          {formatMessage(messages.plannerResult.dayHeading, {
                            dayNumber: formatNumber(day.dayNumber, locale)
                          })}
                        </h3>
                        <p>{formatMessage(messages.plannerResult.daySubheading, {
                          region: day.region,
                          regionDayNumber: formatNumber(day.regionDayNumber, locale)
                        })}</p>
                      </div>
                      <div className="plannerDayMeta">
                        <span className="plannerBadge">
                          {formatMessage(messages.plannerResult.dayWindow, {
                            start: day.startTime || routingDayPlan.routingPolicy.dayStartTime,
                            end: day.endTime || routingDayPlan.routingPolicy.dayStartTime
                          })}
                        </span>
                        {day.notes.includes("unresolved_region_day_slot") ? (
                          <span className="plannerBadge plannerBadgeAlert">
                            {messages.plannerResult.unresolvedLabel}
                          </span>
                        ) : null}
                      </div>
                    </header>

                    <div className="plannerDaySummary">
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryLabel}</span>
                        <strong>
                          {formatMessage(messages.plannerResult.dayStats, {
                            stops: formatNumber(day.stopCount, locale),
                            hours: formatDecimal(day.estimatedVisitHours, locale, 1),
                            km: formatDecimal(day.estimatedTravelKm, locale, 1)
                          })}
                        </strong>
                      </div>
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.dayTravelTime}</span>
                        <strong>
                          {formatNumber(day.estimatedTravelMinutes, locale)} {messages.plannerResult.minuteUnit}
                        </strong>
                      </div>
                    </div>

                    <section className="plannerDayCost">
                      <h4>{messages.plannerResult.dayCostTitle}</h4>
                      <div className="plannerCostGrid">
                        <div>
                          <span>{messages.plannerResult.dayCostTotal}</span>
                          <strong>{formatTicketCost(day.estimatedTicketCostOmr, locale)}</strong>
                        </div>
                        <div>
                          <span>{messages.plannerResult.dayCostPaid}</span>
                          <strong>{formatNumber(paidStopCount, locale)}</strong>
                        </div>
                        <div>
                          <span>{messages.plannerResult.dayCostFree}</span>
                          <strong>{formatNumber(freeStopCount, locale)}</strong>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4>{messages.plannerResult.dayExplanationsTitle}</h4>
                      {highlightedStops.length > 0 ? (
                        <ul className="plannerExplanationList">
                          {highlightedStops.map((stop) => (
                            <li key={`explanation-${day.dayNumber}-${stop.slug}`}>
                              {getReasonExplanation(stop.reasonCodes[0], stop.name[locale], locale)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{messages.plannerResult.noStops}</p>
                      )}
                    </section>

                    <section>
                      <h4>{messages.plannerResult.stopsTitle}</h4>
                      {day.stops.length > 0 ? (
                        <ol className="plannerStopList">
                          {day.stops.map((stop) => (
                            <li
                              key={`${day.dayNumber}-${stop.slug}`}
                              className={
                                stop.slug === activeStopSlug
                                  ? "plannerStopCard plannerStopCardActive"
                                  : "plannerStopCard"
                              }
                            >
                              <div className="plannerStopHeader">
                                <div>
                                  <strong>{stop.name[locale]}</strong>
                                  <p>{formatMessage(messages.plannerResult.stopTimeRange, {
                                    start: stop.startTime,
                                    end: stop.endTime
                                  })}</p>
                                </div>
                                <span className="plannerBadge">{getCrowdLabel(stop.crowdLevel, locale)}</span>
                              </div>
                              <p>{stop.description[locale]}</p>
                              <div className="plannerStopMeta">
                                <span>
                                  {messages.plannerResult.stopDuration}: {formatDecimal(stop.estimatedVisitHours, locale, 1)} {messages.plannerResult.hourUnitShort}
                                </span>
                                <span>
                                  {messages.plannerResult.stopCost}: {stop.ticketCostOmr > 0
                                    ? formatTicketCost(stop.ticketCostOmr, locale)
                                    : messages.plannerResult.costFreeValue}
                                </span>
                                <span>
                                  {messages.plannerResult.stopCrowd}: {getCrowdLabel(stop.crowdLevel, locale)}
                                </span>
                                <span>
                                  {messages.plannerResult.stopTransit}: {formatNumber(stop.travelMinutesFromPrevious, locale)} {messages.plannerResult.minuteUnit}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="plannerStopFocusButton"
                                onClick={() => setActiveStopSlug(stop.slug)}
                              >
                                {messages.plannerResult.focusStop}
                              </button>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p>{messages.plannerResult.noStops}</p>
                      )}
                    </section>
                  </article>
                );
              })() : null}
            </div>

            <div className="ctaRow">
              <Link className="pill" href={`/${locale}/planner`}>
                {messages.common.editInputs}
              </Link>
              <button
                type="button"
                className="pill"
                onClick={() => {
                  clearPersistedItinerary();
                  setPersistedAt("");
                  setPersistedCostBreakdown(readPersistedCostBreakdown() ?? currentCostBreakdown);
                }}
              >
                {messages.plannerResult.clearStored}
              </button>
              <button
                type="button"
                className="pill"
                onClick={() => {
                  clearPlannerDraft();
                  clearPersistedItinerary();
                  setDraft(defaultPlannerDraft);
                  setPersistedAt("");
                  setPersistedCostBreakdown(currentCostBreakdown);
                  router.push(`/${locale}/planner`);
                }}
              >
                {messages.plannerResult.resetAll}
              </button>
              <Link className="pill" href={`/${locale}/saved`}>
                {messages.common.savedInterests}
              </Link>
              <Link className="pill" href={`/${locale}/discover`}>
                {messages.common.backToDiscovery}
              </Link>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
