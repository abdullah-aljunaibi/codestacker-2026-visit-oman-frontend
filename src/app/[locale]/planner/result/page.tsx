"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { destinationsSample } from "@/data/destinations.sample";
import { localeDirection, resolveLocale } from "@/lib/i18n/config";
import { rankCandidatesForPlanner } from "@/lib/planner/candidate-ranking";
import { assembleFinalItinerary } from "@/lib/planner/final-itinerary";
import { generateIntraRegionDayPlans } from "@/lib/planner/intra-region-routing";
import { allocateTripDaysAcrossRegions } from "@/lib/planner/region-allocation";
import type { PlannerDraft } from "@/lib/persistence/planner-draft";
import { defaultPlannerDraft, readPlannerDraft } from "@/lib/persistence/planner-draft";

const plannerDatasetVersion = "destinations.sample.v1";

export default function PlannerResultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = use(params);
  const locale = resolveLocale(localeParam);
  const [draft, setDraft] = useState<PlannerDraft>(defaultPlannerDraft);

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
        destinations: destinationsSample,
        seedDestinationSlugs: draft.selectedDestinationSlugs,
        datasetVersion: plannerDatasetVersion
      }),
    [draft]
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
        destinations: destinationsSample
      }),
    [ranking.handoff, routingDayPlan]
  );

  return (
    <main dir={localeDirection[locale]} className={locale === "ar" ? "ar" : undefined}>
      <div className="shell">
        <section className="card">
          <h1>{locale === "ar" ? "برنامج الرحلة النهائي" : "Final itinerary"}</h1>
          <p>
            {locale === "ar"
              ? "تم تجميع برنامج الرحلة في المرحلة 5C بشكل حتمي من عقود 4C و5A و5B، مع عرض يومي واضح للوجهات وخلاصة عملية للمستخدم."
              : "Phase 5C now assembles a deterministic final itinerary from the Phase 4C, 5A, and 5B contracts with a clear day-by-day user-facing presentation."}
          </p>

          <h2>{locale === "ar" ? "ملخص الإدخال" : "Input summary"}</h2>
          <ul>
            <li>{locale === "ar" ? `الأيام: ${draft.tripDays}` : `Days: ${draft.tripDays}`}</li>
            <li>{locale === "ar" ? `الميزانية: ${draft.budget}` : `Budget: ${draft.budget}`}</li>
            <li>{locale === "ar" ? `الوتيرة: ${draft.pace}` : `Pace: ${draft.pace}`}</li>
            <li>
              {locale === "ar"
                ? `شهر السفر: ${draft.travelMonth ?? "غير محدد"}`
                : `Travel month: ${draft.travelMonth ?? "Not specified"}`}
            </li>
            <li>
              {locale === "ar"
                ? `الأنماط: ${draft.themes.length}`
                : `Themes selected: ${draft.themes.length}`}
            </li>
            <li>
              {locale === "ar"
                ? `الوجهات المحفوظة: ${draft.selectedDestinationSlugs.length}`
                : `Saved destination seeds: ${draft.selectedDestinationSlugs.length}`}
            </li>
          </ul>

          <h2>{locale === "ar" ? "مخرجات المرحلة 5C" : "Phase 5C output"}</h2>
          <ul>
            <li>
              {locale === "ar"
                ? `أيام البرنامج: ${finalItinerary.totals.dayCount}/${finalItinerary.tripDays}`
                : `Itinerary days: ${finalItinerary.totals.dayCount}/${finalItinerary.tripDays}`}
            </li>
            <li>
              {locale === "ar"
                ? `إجمالي المحطات: ${finalItinerary.totals.stopCount}`
                : `Total stops: ${finalItinerary.totals.stopCount}`}
            </li>
            <li>
              {locale === "ar"
                ? `إجمالي ساعات الزيارة: ${finalItinerary.totals.estimatedVisitHours.toFixed(1)}`
                : `Total visit hours: ${finalItinerary.totals.estimatedVisitHours.toFixed(1)}`}
            </li>
            <li>
              {locale === "ar"
                ? `إجمالي مسافة التنقل (كم): ${finalItinerary.totals.estimatedTravelKm.toFixed(1)}`
                : `Total travel km: ${finalItinerary.totals.estimatedTravelKm.toFixed(1)}`}
            </li>
            <li>
              {locale === "ar"
                ? `أيام غير محلولة: ${finalItinerary.totals.unresolvedDayCount}`
                : `Unresolved days: ${finalItinerary.totals.unresolvedDayCount}`}
            </li>
          </ul>

          <div className="listStack">
            {finalItinerary.days.map((day) => (
              <article key={`phase5c-day-${day.dayNumber}`} className="card cardSubtle itineraryDay">
                <h3>
                  {locale === "ar"
                    ? `اليوم ${day.dayNumber} - ${day.region} (${day.regionDayNumber})`
                    : `Day ${day.dayNumber} - ${day.region} (${day.regionDayNumber})`}
                </h3>
                <p>
                  {locale === "ar"
                    ? `محطات: ${day.stopCount} | ساعات: ${day.estimatedVisitHours.toFixed(1)} | كم: ${day.estimatedTravelKm.toFixed(1)}`
                    : `Stops: ${day.stopCount} | Hours: ${day.estimatedVisitHours.toFixed(1)} | Km: ${day.estimatedTravelKm.toFixed(1)}`}
                </p>

                {day.stops.length > 0 ? (
                  <ol className="itineraryStops">
                    {day.stops.map((stop) => (
                      <li key={`${day.dayNumber}-${stop.slug}`} className="itineraryStop">
                        <strong>{locale === "ar" ? stop.name.ar : stop.name.en}</strong>
                        <span>
                          {locale === "ar"
                            ? `${stop.slug} | ساعات تقديرية: ${stop.estimatedVisitHours.toFixed(1)}`
                            : `${stop.slug} | Est. hours: ${stop.estimatedVisitHours.toFixed(1)}`}
                        </span>
                        <span>
                          {locale === "ar"
                            ? `رتبة: ${stop.rank ?? "-"} | درجة: ${stop.score?.toFixed(3) ?? "-"}`
                            : `Rank: ${stop.rank ?? "-"} | Score: ${stop.score?.toFixed(3) ?? "-"}`}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>{locale === "ar" ? "لا توجد محطات لهذا اليوم." : "No stops assigned for this day."}</p>
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

          <h2>{locale === "ar" ? "تتبع العقود" : "Contract traceability"}</h2>
          <ul>
            <li>
              {locale === "ar"
                ? `سياق التخطيط: ${ranking.handoff.planningContextId}`
                : `Planning context ID: ${ranking.handoff.planningContextId}`}
            </li>
            <li>
              {locale === "ar"
                ? `إصدارات المصدر: 4C=${ranking.handoff.handoffVersion}, 5A=${regionAllocation.allocationVersion}, 5B=${routingDayPlan.routingVersion}`
                : `Source versions: 4C=${ranking.handoff.handoffVersion}, 5A=${regionAllocation.allocationVersion}, 5B=${routingDayPlan.routingVersion}`}
            </li>
            <li>
              {locale === "ar"
                ? `إصدار البرنامج النهائي: ${finalItinerary.itineraryVersion}`
                : `Final itinerary version: ${finalItinerary.itineraryVersion}`}
            </li>
          </ul>

          <h3>{locale === "ar" ? "تسليم المرحلة 4C" : "Phase 4C handoff"}</h3>
          <pre>{JSON.stringify(ranking.handoff, null, 2)}</pre>

          <h3>{locale === "ar" ? "عقد توزيع المناطق (5A)" : "Phase 5A region allocation contract"}</h3>
          <pre>{JSON.stringify(regionAllocation, null, 2)}</pre>

          <h3>{locale === "ar" ? "عقد التوجيه/خطة الأيام (5B)" : "Phase 5B routing/day-plan contract"}</h3>
          <pre>{JSON.stringify(routingDayPlan, null, 2)}</pre>

          <h3>{locale === "ar" ? "عقد البرنامج النهائي (5C)" : "Phase 5C final itinerary contract"}</h3>
          <pre>{JSON.stringify(finalItinerary, null, 2)}</pre>

          <div className="ctaRow">
            <Link className="pill" href={`/${locale}/planner`}>
              {locale === "ar" ? "تعديل المدخلات" : "Edit inputs"}
            </Link>
            <Link className="pill" href={`/${locale}/saved`}>
              {locale === "ar" ? "الاهتمامات المحفوظة" : "Saved interests"}
            </Link>
            <Link className="pill" href={`/${locale}/discover`}>
              {locale === "ar" ? "العودة للاكتشاف" : "Back to discovery"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
