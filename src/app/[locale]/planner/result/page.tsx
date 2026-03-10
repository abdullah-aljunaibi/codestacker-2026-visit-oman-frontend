"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { loadDestinationsWithVersion } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { resolveLocale } from "@/lib/i18n/config";
import {
  formatDecimal,
  formatMessage,
  formatNumber,
  formatTicketCost,
  getBudgetLabel,
  getMessages,
  getMonthLabel,
  getTravelIntensityLabel
} from "@/lib/i18n/messages";
import { rankCandidatesForPlanner } from "@/lib/planner/candidate-ranking";
import { assembleFinalItinerary } from "@/lib/planner/final-itinerary";
import { generateIntraRegionDayPlans } from "@/lib/planner/intra-region-routing";
import { allocateTripDaysAcrossRegions } from "@/lib/planner/region-allocation";
import {
  clearPersistedItinerary,
  deriveCostBreakdown,
  readPersistedCostBreakdown,
  readPersistedItinerary,
  writePersistedCostBreakdown,
  writePersistedItinerary
} from "@/lib/persistence/itinerary";
import { readSavedInterestSlugs } from "@/lib/persistence/interests";
import type { PlannerDraft } from "@/lib/persistence/planner-draft";
import {
  clearPlannerDraft,
  defaultPlannerDraft,
  readPlannerDraft
} from "@/lib/persistence/planner-draft";

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
  const summaryLabels =
    locale === "ar"
      ? {
          days: "الأيام",
          budget: "الميزانية",
          travelIntensity: "كثافة الرحلة",
          travelMonth: "شهر السفر",
          categoriesSelected: "الفئات المختارة"
        }
      : {
          days: "Days",
          budget: "Budget",
          travelIntensity: "Travel intensity",
          travelMonth: "Travel month",
          categoriesSelected: "Categories selected"
        };

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

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />

        <section className="card">
          <h1>{messages.plannerResult.title}</h1>
          <p>{messages.plannerResult.body}</p>
          <p className="listHeader">{messages.plannerResult.storageStatus}</p>
          {persistedAt ? <p className="eyebrow">{persistedAt}</p> : null}

          <h2>{messages.plannerResult.inputSummary}</h2>
          <ul>
            <li>{summaryLabels.days}: {formatNumber(draft.tripDurationDays, locale)}</li>
            <li>{summaryLabels.budget}: {getBudgetLabel(draft.budget, locale)}</li>
            <li>{summaryLabels.travelIntensity}: {getTravelIntensityLabel(draft.travelIntensity, locale)}</li>
            <li>{summaryLabels.travelMonth}: {getMonthLabel(draft.travelMonth, locale)}</li>
            <li>{summaryLabels.categoriesSelected}: {formatNumber(draft.preferredCategories.length, locale)}</li>
          </ul>

          <h2>{messages.plannerResult.outputTitle}</h2>
          <ul>
            <li>
              {formatMessage(messages.plannerResult.itineraryDays, {
                value: `${formatNumber(finalItinerary.totals.dayCount, locale)}/${formatNumber(finalItinerary.tripDays, locale)}`
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.totalStops, {
                value: formatNumber(finalItinerary.totals.stopCount, locale)
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.totalVisitHours, {
                value: formatDecimal(finalItinerary.totals.estimatedVisitHours, locale, 1)
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.totalTravelKm, {
                value: formatDecimal(finalItinerary.totals.estimatedTravelKm, locale, 1)
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.unresolvedDays, {
                value: formatNumber(finalItinerary.totals.unresolvedDayCount, locale)
              })}
            </li>
          </ul>

          <section className="card cardSubtle sectionCard">
            <h2>{messages.plannerResult.costBreakdownTitle}</h2>
            <ul>
              <li>
                {formatMessage(messages.plannerResult.costTotal, {
                  value: formatTicketCost(persistedCostBreakdown.totalTicketCostOmr, locale)
                })}
              </li>
              <li>
                {formatMessage(messages.plannerResult.costAverage, {
                  value: formatTicketCost(persistedCostBreakdown.averageTicketCostPerDayOmr, locale)
                })}
              </li>
              <li>
                {formatMessage(messages.plannerResult.costPaidStops, {
                  value: formatNumber(persistedCostBreakdown.paidStopCount, locale)
                })}
              </li>
              <li>
                {formatMessage(messages.plannerResult.costFreeStops, {
                  value: formatNumber(persistedCostBreakdown.freeStopCount, locale)
                })}
              </li>
            </ul>
          </section>

          <div className="listStack">
            {finalItinerary.days.map((day) => (
              <article key={`phase5c-day-${day.dayNumber}`} className="card cardSubtle itineraryDay">
                <h3>
                  {formatMessage(messages.plannerResult.dayHeading, {
                    dayNumber: formatNumber(day.dayNumber, locale),
                    region: day.region,
                    regionDayNumber: formatNumber(day.regionDayNumber, locale)
                  })}
                </h3>
                <p>
                  {formatMessage(messages.plannerResult.dayStats, {
                    stops: formatNumber(day.stopCount, locale),
                    hours: formatDecimal(day.estimatedVisitHours, locale, 1),
                    km: formatDecimal(day.estimatedTravelKm, locale, 1)
                  })}
                </p>

                {day.stops.length > 0 ? (
                  <ol className="itineraryStops">
                    {day.stops.map((stop) => (
                      <li key={`${day.dayNumber}-${stop.slug}`} className="itineraryStop">
                        <strong>{stop.name[locale]}</strong>
                        <span>
                          {formatMessage(messages.plannerResult.stopHours, {
                            slug: stop.slug,
                            hours: formatDecimal(stop.estimatedVisitHours, locale, 1)
                          })}
                        </span>
                        <span>
                          {formatMessage(messages.plannerResult.stopRank, {
                            rank: stop.rank ?? "-",
                            score: stop.score == null ? "-" : formatDecimal(stop.score, locale, 3)
                          })}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>{messages.plannerResult.noStops}</p>
                )}

                <div className="metaList">
                  {day.notes.map((note) => (
                    <span key={`${day.dayNumber}-${note}`} className="meta">
                      {note}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <h2>{messages.plannerResult.traceabilityTitle}</h2>
          <ul>
            <li>
              {formatMessage(messages.plannerResult.planningContext, {
                value: ranking.handoff.planningContextId
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.sourceVersions, {
                handoff: ranking.handoff.handoffVersion,
                allocation: regionAllocation.allocationVersion,
                routing: routingDayPlan.routingVersion
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.finalVersion, {
                value: finalItinerary.itineraryVersion
              })}
            </li>
          </ul>

          <h3>{messages.plannerResult.handoffTitle}</h3>
          <pre>{JSON.stringify(ranking.handoff, null, 2)}</pre>

          <h3>{messages.plannerResult.allocationTitle}</h3>
          <pre>{JSON.stringify(regionAllocation, null, 2)}</pre>

          <h3>{messages.plannerResult.routingTitle}</h3>
          <pre>{JSON.stringify(routingDayPlan, null, 2)}</pre>

          <h3>{messages.plannerResult.finalContractTitle}</h3>
          <pre>{JSON.stringify(finalItinerary, null, 2)}</pre>

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
      </div>
    </main>
  );
}
