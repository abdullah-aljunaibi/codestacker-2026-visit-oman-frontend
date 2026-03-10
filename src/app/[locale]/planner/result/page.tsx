"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";

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
  getCategoryLabel,
  getMessages,
  getMonthLabel,
  getTravelIntensityLabel
} from "../../../../lib/i18n/messages";
import { rankCandidatesForPlanner } from "../../../../lib/planner/candidate-ranking";
import { assembleFinalItinerary } from "../../../../lib/planner/final-itinerary";
import { generateIntraRegionDayPlans } from "../../../../lib/planner/intra-region-routing";
import { allocateTripDaysAcrossRegions } from "../../../../lib/planner/region-allocation";
import { haversineDistanceKm } from "../../../../lib/planner/scoring-utils";
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
import type { ItineraryStop } from "../../../../lib/planner/final-itinerary";

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

function getReasonLabel(reasonCode: string | undefined, locale: Locale): string {
  const messages = getMessages(locale);

  if (reasonCode === "interest_match") return messages.plannerResult.reasonInterestLabel;
  if (reasonCode === "season_fit") return messages.plannerResult.reasonSeasonLabel;
  if (reasonCode === "diversity_gain") return messages.plannerResult.reasonDiversityLabel;
  if (reasonCode === "cost_penalty") return messages.plannerResult.reasonBudgetLabel;
  if (reasonCode === "crowd_penalty") return messages.plannerResult.reasonCrowdLabel;
  if (reasonCode === "detour_penalty") return messages.plannerResult.reasonDetourLabel;

  return messages.plannerResult.reasonFallbackLabel;
}

function getReasonExplanation(reasonCode: string | undefined, name: string, locale: Locale): string {
  const messages = getMessages(locale);
  const template =
    reasonCode === "interest_match"
      ? messages.plannerResult.reasonInterest
      : reasonCode === "season_fit"
        ? messages.plannerResult.reasonSeason
        : reasonCode === "diversity_gain"
          ? messages.plannerResult.reasonDiversity
          : reasonCode === "cost_penalty"
            ? messages.plannerResult.reasonBudget
            : reasonCode === "crowd_penalty"
              ? messages.plannerResult.reasonCrowd
              : reasonCode === "detour_penalty"
                ? messages.plannerResult.reasonDetour
                : messages.plannerResult.reasonFallback;

  return formatMessage(template, { name });
}

function formatStoredAt(value: string, locale: Locale): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatList(values: string[], locale: Locale): string {
  if (values.length === 0) {
    return "";
  }

  return new Intl.ListFormat(locale === "ar" ? "ar" : "en", {
    style: "long",
    type: "conjunction"
  }).format(values);
}

function getIntensityCap(travelIntensity: PlannerDraft["travelIntensity"]): number {
  if (travelIntensity === "relaxed") return 3;
  if (travelIntensity === "balanced") return 4;
  return 5;
}

function getTravelKmFromPrevious(stops: ItineraryStop[], stopIndex: number, coordinatesBySlug: Map<string, {
  lat: number;
  lng: number;
}>): number {
  if (stopIndex === 0) {
    return 0;
  }

  const previous = coordinatesBySlug.get(stops[stopIndex - 1].slug);
  const current = coordinatesBySlug.get(stops[stopIndex].slug);

  if (!previous || !current) {
    return 0;
  }

  return haversineDistanceKm(previous, current);
}

export default function PlannerResultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = use(params);
  const locale = resolveLocale(localeParam);
  const messages = getMessages(locale);
  const router = useRouter();
  const [draft, setDraft] = useState<PlannerDraft>(defaultPlannerDraft);
  const [savedInterestSlugs, setSavedInterestSlugs] = useState<string[]>([]);
  const [hasHydratedPersistence, setHasHydratedPersistence] = useState(false);
  const [persistedAt, setPersistedAt] = useState("");
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const { datasetVersion, destinations } = useMemo(() => loadDestinationsWithVersion(), []);
  const normalizedDestinations = useMemo(
    () => normalizeDestinations(destinations, locale),
    [destinations, locale]
  );
  const tabRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    setDraft(readPlannerDraft());
    setSavedInterestSlugs(readSavedInterestSlugs());

    const persistedItinerary = readPersistedItinerary({ datasetVersion, locale });
    if (persistedItinerary) {
      setPersistedAt(persistedItinerary.savedAt);
      setSelectedDayNumber(persistedItinerary.selectedDayNumber);
    }
    setHasHydratedPersistence(true);
  }, [datasetVersion, locale]);

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
    () => deriveCostBreakdown(finalItinerary, draft.budget),
    [draft.budget, finalItinerary]
  );
  const [persistedCostBreakdown, setPersistedCostBreakdown] = useState(currentCostBreakdown);
  const [activeStopSlug, setActiveStopSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydratedPersistence) {
      return;
    }

    const persisted = readPersistedItinerary({ datasetVersion, locale });
    const savedAt = persisted?.savedAt ?? new Date().toISOString();
    const costBreakdown = {
      ...currentCostBreakdown,
      datasetVersion,
      savedAt
    };

    writePersistedItinerary({
      schemaVersion: 2,
      locale,
      datasetVersion,
      savedAt,
      selectedDayNumber,
      costBreakdown,
      itinerary: finalItinerary
    });
    writePersistedCostBreakdown(costBreakdown);
    setPersistedAt(savedAt);
    setPersistedCostBreakdown(costBreakdown);
  }, [currentCostBreakdown, datasetVersion, finalItinerary, hasHydratedPersistence, locale, selectedDayNumber]);

  useEffect(() => {
    const savedBreakdown = readPersistedCostBreakdown({ datasetVersion });
    if (savedBreakdown) {
      setPersistedCostBreakdown(savedBreakdown);
    }
  }, [datasetVersion]);

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

  const destinationBySlug = useMemo(
    () => new Map(normalizedDestinations.map((destination) => [destination.slug, destination])),
    [normalizedDestinations]
  );

  const coordinatesBySlug = useMemo(
    () =>
      new Map(
        normalizedDestinations.map((destination) => [destination.slug, destination.coordinates])
      ),
    [normalizedDestinations]
  );

  const itineraryMapDays = useMemo(
    () =>
      finalItinerary.days.map((day) => ({
        dayNumber: day.dayNumber,
        stops: day.stops.map((stop) => {
          const destination = destinationBySlug.get(stop.slug);

          return {
            slug: stop.slug,
            name: stop.name[locale],
            lat: destination?.coordinates.lat ?? 0,
            lng: destination?.coordinates.lng ?? 0
          };
        })
      })),
    [destinationBySlug, finalItinerary.days, locale]
  );

  const uniqueRegions = useMemo(
    () => Array.from(new Set(finalItinerary.days.map((day) => day.region))),
    [finalItinerary.days]
  );

  const tripSettings = [
    getBudgetLabel(draft.budget, locale),
    getTravelIntensityLabel(draft.travelIntensity, locale),
    getMonthLabel(draft.travelMonth, locale),
    formatMessage(messages.plannerResult.tripCategoryCount, {
      count: formatNumber(draft.preferredCategories.length, locale)
    }),
    formatMessage(messages.plannerResult.tripSavedCount, {
      count: formatNumber(savedInterestSlugs.length, locale)
    })
  ];

  const overviewCards = [
    {
      label: messages.plannerResult.days,
      value: formatNumber(finalItinerary.totals.dayCount, locale),
      meta: formatMessage(messages.plannerResult.overviewDaysMeta, {
        total: formatNumber(finalItinerary.tripDays, locale)
      })
    },
    {
      label: messages.plannerResult.totalStops,
      value: formatNumber(finalItinerary.totals.stopCount, locale),
      meta: formatMessage(messages.plannerResult.overviewStopsMeta, {
        count: formatNumber(persistedCostBreakdown.paidStopCount, locale)
      })
    },
    {
      label: messages.plannerResult.overviewRegions,
      value: formatNumber(uniqueRegions.length, locale),
      meta: formatList(uniqueRegions, locale)
    },
    {
      label: messages.plannerResult.totalVisitHours,
      value: formatDecimal(finalItinerary.totals.estimatedVisitHours, locale, 1),
      meta: messages.plannerResult.overviewVisitMeta
    },
    {
      label: messages.plannerResult.totalTravelKm,
      value: formatDecimal(finalItinerary.totals.estimatedTravelKm, locale, 1),
      meta: formatMessage(messages.plannerResult.overviewTravelMeta, {
        minutes: formatNumber(
          finalItinerary.days.reduce((sum, day) => sum + day.estimatedTravelMinutes, 0),
          locale
        )
      })
    },
    {
      label: messages.plannerResult.overviewTotalCost,
      value: formatTicketCost(persistedCostBreakdown.totalCostOmr, locale),
      meta: formatMessage(messages.plannerResult.overviewBudgetMeta, {
        threshold: formatTicketCost(persistedCostBreakdown.budgetThresholdOmr, locale)
      })
    },
    {
      label: messages.plannerResult.overviewBudgetStatus,
      value: persistedCostBreakdown.withinBudget
        ? messages.plannerResult.withinBudgetYes
        : messages.plannerResult.withinBudgetNo,
      meta:
        finalItinerary.repairSummary.actions.length > 0
          ? formatMessage(messages.plannerResult.overviewRepairMeta, {
              count: formatNumber(finalItinerary.repairSummary.actions.length, locale)
            })
          : messages.plannerResult.overviewRepairClean
    }
  ];

  const selectedDaySummary = selectedDay
    ? {
        paidStopCount: selectedDay.stops.filter((stop) => stop.ticketCostOmr > 0).length,
        freeStopCount: selectedDay.stops.filter((stop) => stop.ticketCostOmr <= 0).length
      }
    : null;

  const selectedDayTimeline = useMemo(() => {
    if (!selectedDay) {
      return [];
    }

    return selectedDay.stops.map((stop, index) => {
      const destination = destinationBySlug.get(stop.slug);

      return {
        ...stop,
        order: index + 1,
        categories: (destination?.categories ?? []).map((category) => getCategoryLabel(category, locale)),
        travelKmFromPrevious: getTravelKmFromPrevious(selectedDay.stops, index, coordinatesBySlug),
        reasonLabels: Array.from(
          new Set(stop.topContributors.slice(0, 2).map((item) => getReasonLabel(item.reasonCode, locale)))
        )
      };
    });
  }, [coordinatesBySlug, destinationBySlug, locale, selectedDay]);

  const selectedDayReasonLabels = useMemo(
    () =>
      Array.from(
        new Set(
          selectedDayTimeline.flatMap((stop) => stop.reasonLabels)
        )
      ).slice(0, 3),
    [selectedDayTimeline]
  );

  const selectedRegionCandidateCount = useMemo(() => {
    if (!selectedDay) {
      return 0;
    }

    return ranking.handoff.rankedCandidates.filter((candidate) => {
      const destination = destinationBySlug.get(candidate.slug);
      return destination?.regionKey === selectedDay.region && candidate.decision !== "excluded";
    }).length;
  }, [destinationBySlug, ranking.handoff.rankedCandidates, selectedDay]);

  const selectionFactors = useMemo(
    () => [
      formatMessage(messages.plannerResult.selectionFactorCategories, {
        count: formatNumber(draft.preferredCategories.length, locale)
      }),
      formatMessage(messages.plannerResult.selectionFactorMonth, {
        month: getMonthLabel(draft.travelMonth, locale)
      }),
      formatMessage(messages.plannerResult.selectionFactorBudget, {
        budget: getBudgetLabel(draft.budget, locale)
      }),
      formatMessage(messages.plannerResult.selectionFactorPace, {
        pace: getTravelIntensityLabel(draft.travelIntensity, locale),
        cap: formatNumber(getIntensityCap(draft.travelIntensity), locale)
      }),
      formatMessage(messages.plannerResult.selectionFactorRegions, {
        count: formatNumber(uniqueRegions.length, locale)
      }),
      ...(savedInterestSlugs.length > 0
        ? [
            formatMessage(messages.plannerResult.selectionFactorSaved, {
              count: formatNumber(savedInterestSlugs.length, locale)
            })
          ]
        : [])
    ],
    [draft.budget, draft.preferredCategories.length, draft.travelIntensity, draft.travelMonth, locale, messages.plannerResult.selectionFactorBudget, messages.plannerResult.selectionFactorCategories, messages.plannerResult.selectionFactorMonth, messages.plannerResult.selectionFactorPace, messages.plannerResult.selectionFactorRegions, messages.plannerResult.selectionFactorSaved, savedInterestSlugs.length, uniqueRegions.length]
  );

  const handleDayChange = (dayNumber: number) => {
    const day = finalItinerary.days.find((item) => item.dayNumber === dayNumber);
    setSelectedDayNumber(dayNumber);
    setActiveStopSlug(day?.stops[0]?.slug ?? null);
  };

  const handleDayTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (finalItinerary.days.length === 0) {
      return;
    }

    const lastIndex = finalItinerary.days.length - 1;
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = lastIndex;
    } else {
      return;
    }

    const nextDayNumber = finalItinerary.days[nextIndex]?.dayNumber;
    if (!nextDayNumber) {
      return;
    }

    handleDayChange(nextDayNumber);
    tabRefs.current[nextDayNumber]?.focus();
  };

  const handleMapStopChange = (slug: string) => {
    const day = finalItinerary.days.find((item) => item.stops.some((stop) => stop.slug === slug));
    if (day) {
      setSelectedDayNumber(day.dayNumber);
    }
    setActiveStopSlug(slug);
  };

  const repairSavings = Math.max(
    0,
    finalItinerary.repairSummary.initialTotalCostOmr - finalItinerary.repairSummary.finalTotalCostOmr
  );

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />

        <section className="hero plannerResultHero">
          <span className="kicker">{messages.plannerResult.outputTitle}</span>
          <h1>{messages.plannerResult.title}</h1>
          <p>{messages.plannerResult.body}</p>
          <div className="plannerTripSettings" aria-label={messages.plannerResult.tripSettingsTitle}>
            {tripSettings.map((item) => (
              <span key={item} className="plannerInlineChip">
                {item}
              </span>
            ))}
          </div>
          <p className="plannerPersistedMeta">
            {messages.plannerResult.storageStatus}
            {persistedAt ? ` ${formatStoredAt(persistedAt, locale)}` : ""}
          </p>
        </section>

        <section className="plannerOverviewGrid" aria-label={messages.plannerResult.overviewTitle}>
          {overviewCards.map((card) => (
            <article key={card.label} className="card plannerOverviewCard">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.meta}</p>
            </article>
          ))}
        </section>

        {finalItinerary.days.length > 0 ? (
          <>
            <section className="card plannerDaySelectorCard">
              <div className="plannerDaySelectorHeader">
                <div>
                  <h2>{messages.plannerResult.itineraryTitle}</h2>
                  <p>{messages.plannerResult.daySelectorBody}</p>
                </div>
              </div>

              <div className="plannerDayTabs" role="tablist" aria-label={messages.plannerResult.daySwitcherLabel}>
                {finalItinerary.days.map((day, index) => (
                  <button
                    key={`day-tab-${day.dayNumber}`}
                    ref={(node) => {
                      tabRefs.current[day.dayNumber] = node;
                    }}
                    id={`day-tab-${day.dayNumber}`}
                    type="button"
                    role="tab"
                    aria-controls={`day-panel-${day.dayNumber}`}
                    aria-selected={day.dayNumber === selectedDayNumber}
                    tabIndex={day.dayNumber === selectedDayNumber ? 0 : -1}
                    className={day.dayNumber === selectedDayNumber ? "plannerDayTab plannerDayTabActive" : "plannerDayTab"}
                    onClick={() => handleDayChange(day.dayNumber)}
                    onKeyDown={(event) => handleDayTabKeyDown(event, index)}
                  >
                    <span>{formatMessage(messages.plannerResult.dayTabLabel, {
                      dayNumber: formatNumber(day.dayNumber, locale)
                    })}</span>
                    <small>{day.region}</small>
                  </button>
                ))}
              </div>
            </section>

            {selectedDay ? (
              <section className="plannerWorkbench">
                <div className="plannerPrimaryColumn">
                  <article
                    id={`day-panel-${selectedDay.dayNumber}`}
                    role="tabpanel"
                    aria-labelledby={`day-tab-${selectedDay.dayNumber}`}
                    className="card plannerDaySummaryCard"
                  >
                    <div className="plannerDaySummaryHeader">
                      <div>
                        <h2>
                          {formatMessage(messages.plannerResult.dayHeading, {
                            dayNumber: formatNumber(selectedDay.dayNumber, locale)
                          })}
                        </h2>
                        <p>{formatMessage(messages.plannerResult.daySubheading, {
                          region: selectedDay.region,
                          regionDayNumber: formatNumber(selectedDay.regionDayNumber, locale)
                        })}</p>
                      </div>
                      <div className="plannerDayMeta">
                        <span className="plannerBadge">
                          {formatMessage(messages.plannerResult.dayWindow, {
                            start: selectedDay.startTime || routingDayPlan.routingPolicy.dayStartTime,
                            end: selectedDay.endTime || routingDayPlan.routingPolicy.dayStartTime
                          })}
                        </span>
                        {selectedDay.notes.includes("unresolved_region_day_slot") ? (
                          <span className="plannerBadge plannerBadgeAlert">
                            {messages.plannerResult.unresolvedLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="plannerDaySummaryGrid">
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryRegion}</span>
                        <strong>{selectedDay.region}</strong>
                      </div>
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryDistance}</span>
                        <strong>{formatDecimal(selectedDay.estimatedTravelKm, locale, 1)} km</strong>
                      </div>
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryDrive}</span>
                        <strong>
                          {formatNumber(selectedDay.estimatedTravelMinutes, locale)} {messages.plannerResult.minuteUnit}
                        </strong>
                      </div>
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryVisit}</span>
                        <strong>{formatDecimal(selectedDay.estimatedVisitHours, locale, 1)} {messages.plannerResult.hourUnitShort}</strong>
                      </div>
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryPaid}</span>
                        <strong>{formatNumber(selectedDaySummary?.paidStopCount ?? 0, locale)}</strong>
                      </div>
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryFree}</span>
                        <strong>{formatNumber(selectedDaySummary?.freeStopCount ?? 0, locale)}</strong>
                      </div>
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryTickets}</span>
                        <strong>{formatTicketCost(selectedDay.estimatedTicketCostOmr, locale)}</strong>
                      </div>
                    </div>
                  </article>

                  <article className="card plannerTimelineCard">
                    <div className="plannerSectionIntro">
                      <h2>{messages.plannerResult.timelineTitle}</h2>
                      <p>{messages.plannerResult.timelineBody}</p>
                    </div>

                    {selectedDayTimeline.length > 0 ? (
                      <ol className="plannerTimeline">
                        {selectedDayTimeline.map((stop) => (
                          <li
                            key={`${selectedDay.dayNumber}-${stop.slug}`}
                            className={
                              stop.slug === activeStopSlug
                                ? "plannerTimelineItem plannerTimelineItemActive"
                                : "plannerTimelineItem"
                            }
                          >
                            <button
                              type="button"
                              className="plannerTimelineMarker"
                              onClick={() => setActiveStopSlug(stop.slug)}
                              aria-label={formatMessage(messages.plannerResult.stopOrderLabel, {
                                order: formatNumber(stop.order, locale)
                              })}
                            >
                              {formatNumber(stop.order, locale)}
                            </button>

                            <article className="plannerTimelineCardInner">
                              <div className="plannerTimelineHeader">
                                <div>
                                  <div className="plannerTimelineEyebrow">
                                    <span className="plannerTimelineOrder">
                                      {formatMessage(messages.plannerResult.stopOrderLabel, {
                                        order: formatNumber(stop.order, locale)
                                      })}
                                    </span>
                                    <span
                                      className={
                                        stop.ticketCostOmr > 0
                                          ? "plannerBadge plannerBadgeNeutral"
                                          : "plannerBadge plannerBadgeSuccess"
                                      }
                                    >
                                      {stop.ticketCostOmr > 0
                                        ? messages.plannerResult.stopPaidBadge
                                        : messages.plannerResult.stopFreeBadge}
                                    </span>
                                  </div>
                                  <h3>{stop.name[locale]}</h3>
                                  <p>{formatMessage(messages.plannerResult.stopTimeRange, {
                                    start: stop.startTime,
                                    end: stop.endTime
                                  })}</p>
                                </div>
                                <span className="plannerBadge">{getCrowdLabel(stop.crowdLevel, locale)}</span>
                              </div>

                              <div className="plannerChipRow">
                                {stop.categories.map((category) => (
                                  <span key={`${stop.slug}-${category}`} className="plannerChip">
                                    {category}
                                  </span>
                                ))}
                              </div>

                              <div className="plannerTimelineMeta">
                                <span>
                                  {messages.plannerResult.stopDuration}: {formatDecimal(stop.estimatedVisitHours, locale, 1)} {messages.plannerResult.hourUnitShort}
                                </span>
                                <span>
                                  {messages.plannerResult.stopCost}: {stop.ticketCostOmr > 0
                                    ? formatTicketCost(stop.ticketCostOmr, locale)
                                    : messages.plannerResult.costFreeValue}
                                </span>
                                <span>
                                  {messages.plannerResult.stopTravel}: {stop.order === 1
                                    ? messages.plannerResult.stopTravelStart
                                    : formatMessage(messages.plannerResult.stopTravelSummary, {
                                        km: formatDecimal(stop.travelKmFromPrevious, locale, 1),
                                        minutes: formatNumber(stop.travelMinutesFromPrevious, locale)
                                      })}
                                </span>
                              </div>

                              {stop.reasonLabels.length > 0 ? (
                                <div className="plannerTimelineReasons" aria-label={messages.plannerResult.stopReasonTitle}>
                                  {stop.reasonLabels.map((reason) => (
                                    <span key={`${stop.slug}-${reason}`} className="plannerReasonChip">
                                      {reason}
                                    </span>
                                  ))}
                                </div>
                              ) : null}

                              <p className="plannerTimelineExplanation">
                                {getReasonExplanation(stop.topContributors[0]?.reasonCode, stop.name[locale], locale)}
                              </p>
                            </article>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p>{messages.plannerResult.noStops}</p>
                    )}
                  </article>
                </div>

                <aside className="plannerSecondaryColumn">
                  <article className="card plannerWhyCard">
                    <div className="plannerSectionIntro">
                      <h2>{messages.plannerResult.whyTitle}</h2>
                      <p>{messages.plannerResult.whyBody}</p>
                    </div>

                    <div className="plannerWhyBlock">
                      <h3>{messages.plannerResult.whyRegionTitle}</h3>
                      <p>{formatMessage(messages.plannerResult.whyRegionBody, {
                        region: selectedDay.region,
                        count: formatNumber(selectedRegionCandidateCount, locale),
                        dayNumber: formatNumber(selectedDay.dayNumber, locale),
                        factors: selectedDayReasonLabels.length > 0
                          ? formatList(selectedDayReasonLabels, locale)
                          : messages.plannerResult.reasonFallbackLabel
                      })}</p>
                    </div>

                    <div className="plannerWhyBlock">
                      <h3>{messages.plannerResult.whyBudgetTitle}</h3>
                      <p>
                        {finalItinerary.repairSummary.actions.length > 0
                          ? formatMessage(messages.plannerResult.whyBudgetWithRepair, {
                              count: formatNumber(finalItinerary.repairSummary.actions.length, locale),
                              savings: formatTicketCost(repairSavings, locale),
                              status: persistedCostBreakdown.withinBudget
                                ? messages.plannerResult.withinBudgetYes
                                : messages.plannerResult.withinBudgetNo
                            })
                          : formatMessage(messages.plannerResult.whyBudgetNoRepair, {
                              status: persistedCostBreakdown.withinBudget
                                ? messages.plannerResult.withinBudgetYes
                                : messages.plannerResult.withinBudgetNo
                            })}
                      </p>
                    </div>

                    <div className="plannerWhyBlock">
                      <h3>{messages.plannerResult.whyFactorsTitle}</h3>
                      <ul className="plannerSelectionFactors">
                        {selectionFactors.map((factor) => (
                          <li key={factor}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  </article>

                  <article className="card plannerMapCard">
                    <div className="plannerMapCardHeader">
                      <h2>{messages.plannerResult.mapTitle}</h2>
                      <p>{messages.plannerResult.mapBody}</p>
                    </div>
                    <ItineraryMapClient
                      days={itineraryMapDays}
                      selectedDayNumber={selectedDayNumber}
                      activeStopSlug={activeStopSlug}
                      locale={locale}
                      onActiveStopChange={handleMapStopChange}
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

                  <article className="card plannerCostPanel">
                    <div className="plannerPanelHeader">
                      <h2>{messages.plannerResult.costBreakdownTitle}</h2>
                      <span
                        className={
                          persistedCostBreakdown.withinBudget
                            ? "plannerBadge plannerBadgeSuccess"
                            : "plannerBadge plannerBadgeAlert"
                        }
                      >
                        {persistedCostBreakdown.withinBudget
                          ? messages.plannerResult.withinBudgetYes
                          : messages.plannerResult.withinBudgetNo}
                      </span>
                    </div>
                    <div className="plannerInfoStack">
                      <div className="plannerInfoRow">
                        <span>{messages.plannerResult.costFuel}</span>
                        <strong>{formatTicketCost(persistedCostBreakdown.fuelCostOmr, locale)}</strong>
                      </div>
                      <div className="plannerInfoRow">
                        <span>{messages.plannerResult.costTickets}</span>
                        <strong>{formatTicketCost(persistedCostBreakdown.ticketsCostOmr, locale)}</strong>
                      </div>
                      <div className="plannerInfoRow">
                        <span>{messages.plannerResult.costFood}</span>
                        <strong>{formatTicketCost(persistedCostBreakdown.foodCostOmr, locale)}</strong>
                      </div>
                      <div className="plannerInfoRow">
                        <span>{messages.plannerResult.costHotel}</span>
                        <strong>{formatTicketCost(persistedCostBreakdown.hotelCostOmr, locale)}</strong>
                      </div>
                      <div className="plannerInfoRow">
                        <span>{messages.plannerResult.costTotal}</span>
                        <strong>{formatTicketCost(persistedCostBreakdown.totalCostOmr, locale)}</strong>
                      </div>
                    </div>
                  </article>
                </aside>
              </section>
            ) : null}
          </>
        ) : (
          <section className="card plannerEmptyState">
            <h2>{messages.plannerResult.itineraryTitle}</h2>
            <p>{messages.plannerResult.noStops}</p>
          </section>
        )}

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
              setPersistedCostBreakdown(readPersistedCostBreakdown({ datasetVersion }) ?? currentCostBreakdown);
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
      </div>
    </main>
  );
}
