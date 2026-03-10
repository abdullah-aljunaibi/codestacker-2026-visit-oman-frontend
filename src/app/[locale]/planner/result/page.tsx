"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { loadDestinationsWithVersion } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { resolveLocale } from "@/lib/i18n/config";
import {
  formatDecimal,
  formatMessage,
  formatNumber,
  getBudgetLabel,
  getMessages,
  getMonthLabel,
  getPaceLabel
} from "@/lib/i18n/messages";
import { rankCandidatesForPlanner } from "@/lib/planner/candidate-ranking";
import { assembleFinalItinerary } from "@/lib/planner/final-itinerary";
import { generateIntraRegionDayPlans } from "@/lib/planner/intra-region-routing";
import { allocateTripDaysAcrossRegions } from "@/lib/planner/region-allocation";
import type { PlannerDraft } from "@/lib/persistence/planner-draft";
import { defaultPlannerDraft, readPlannerDraft } from "@/lib/persistence/planner-draft";

export default function PlannerResultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = use(params);
  const locale = resolveLocale(localeParam);
  const messages = getMessages(locale);
  const [draft, setDraft] = useState<PlannerDraft>(defaultPlannerDraft);
  const { datasetVersion, destinations } = useMemo(() => loadDestinationsWithVersion(), []);
  const normalizedDestinations = useMemo(
    () => normalizeDestinations(destinations, locale),
    [destinations, locale]
  );

  useEffect(() => {
    setDraft(readPlannerDraft());
  }, []);

  const ranking = useMemo(
    () =>
      rankCandidatesForPlanner({
        profile: {
          themes: draft.themes,
          tripDays: draft.tripDays,
          pace: draft.pace,
          budget: draft.budget,
          travelMonth: draft.travelMonth
        },
        destinations: normalizedDestinations,
        seedDestinationSlugs: draft.selectedDestinationSlugs,
        datasetVersion
      }),
    [datasetVersion, draft, normalizedDestinations]
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

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />

        <section className="card">
          <h1>{messages.plannerResult.title}</h1>
          <p>{messages.plannerResult.body}</p>

          <h2>{messages.plannerResult.inputSummary}</h2>
          <ul>
            <li>{formatMessage(messages.plannerResult.days, { value: formatNumber(draft.tripDays, locale) })}</li>
            <li>
              {formatMessage(messages.plannerResult.budget, {
                value: getBudgetLabel(draft.budget, locale)
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.pace, {
                value: getPaceLabel(draft.pace, locale)
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.travelMonth, {
                value: draft.travelMonth ? getMonthLabel(draft.travelMonth, locale) : messages.common.notSpecified
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.themesSelected, {
                value: formatNumber(draft.themes.length, locale)
              })}
            </li>
            <li>
              {formatMessage(messages.plannerResult.savedSeeds, {
                value: formatNumber(draft.selectedDestinationSlugs.length, locale)
              })}
            </li>
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
