"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

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
import type { DatasetRegionKey, Locale } from "../../../../types/dataset";

const ItineraryMapClient = dynamic(
  () => import("../../../../components/maps/itinerary-map.client"),
  { ssr: false }
);

const regionAccentMap: Record<DatasetRegionKey, { solid: string; soft: string }> = {
  muscat: { solid: "#0f766e", soft: "rgba(15, 118, 110, 0.12)" },
  dakhiliya: { solid: "#b45309", soft: "rgba(180, 83, 9, 0.14)" },
  sharqiya: { solid: "#2563eb", soft: "rgba(37, 99, 235, 0.12)" },
  dhofar: { solid: "#3f8f4d", soft: "rgba(63, 143, 77, 0.12)" },
  batinah: { solid: "#7c3aed", soft: "rgba(124, 58, 237, 0.12)" },
  dhahira: { solid: "#be185d", soft: "rgba(190, 24, 93, 0.12)" }
};

function getRegionAccent(regionKey: string) {
  return regionAccentMap[regionKey as DatasetRegionKey] ?? { solid: "#0a4d5c", soft: "rgba(10, 77, 92, 0.12)" };
}

function getCrowdDots(crowdLevel: number) {
  return Array.from({ length: 5 }, (_, index) => index < crowdLevel);
}

function getBudgetStatusTone(withinBudget: boolean, totalCostOmr: number, budgetThresholdOmr: number) {
  if (!withinBudget) {
    return "critical";
  }

  if (budgetThresholdOmr <= 0) {
    return "healthy";
  }

  return totalCostOmr / budgetThresholdOmr >= 0.9 ? "watch" : "healthy";
}

function getBudgetStatusClass(tone: "healthy" | "watch" | "critical") {
  if (tone === "healthy") return "plannerBadge plannerBadgeSuccess";
  if (tone === "watch") return "plannerBadge plannerBadgeAlert";
  return "plannerBadge plannerBadgeCritical";
}

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

function getRepairCopy(locale: Locale) {
  if (locale === "ar") {
    return {
      statusTitle: "حالة الإصلاح",
      statusNotNeeded: "لم يلزم",
      statusRecovered: "تمت المعالجة",
      statusUnresolved: "ما زالت فوق الميزانية",
      noteTriggered: "تم تشغيل إصلاح الميزانية بعد أن تجاوز البرنامج الأولي حد تكلفة الرحلة الكاملة.",
      noteNoReplacement: "لم يتبق بديل أفضل في المنطقة نفسها دون إضعاف تغطية الفئات.",
      noteRoutePreserved: "تم تجاوز تبديل محتمل لأنه كان سيكسر قيود مسار اليوم.",
      noteCategoryCoverage: "حافظت التبديلات على تغطية الفئات مع خفض التكلفة.",
      noteCompleted: "أعادت خطوات الإصلاح البرنامج إلى داخل حد الميزانية المختار.",
      noteGapRemaining: "استنفد المخطط التبديلات الصالحة قبل العودة الكاملة إلى داخل الميزانية.",
      noteNotNeeded: "كان البرنامج الأولي ضمن حد الميزانية المختار بالفعل.",
      attempted:
        "تم تشغيل إصلاح الميزانية، لكن لم تتبق تبديلات صالحة في المنطقة نفسها لتحسين الرحلة أكثر. الرحلة الحالية ما زالت {status}."
    };
  }

  return {
    statusTitle: "Repair status",
    statusNotNeeded: "Not needed",
    statusRecovered: "Recovered",
    statusUnresolved: "Still over budget",
    noteTriggered: "Budget repair triggered after the initial itinerary exceeded the full-trip threshold.",
    noteNoReplacement: "No better same-region replacement remained without weakening category coverage.",
    noteRoutePreserved: "A possible swap was skipped because it would have broken day routing constraints.",
    noteCategoryCoverage: "Swaps preserved the itinerary's category coverage while lowering cost.",
    noteCompleted: "Repairs brought the itinerary back within the selected budget threshold.",
    noteGapRemaining: "The planner exhausted valid swaps before the trip could return within budget.",
    noteNotNeeded: "The initial itinerary already satisfied the selected budget threshold.",
    attempted:
      "Budget repair ran, but no valid same-region swaps could improve the trip further. The current trip remains {status}."
  };
}

function getRepairNoteLabel(note: string, locale: Locale): string {
  const repairCopy = getRepairCopy(locale);

  if (note === "budget_repair_triggered") return repairCopy.noteTriggered;
  if (note === "budget_repair_no_better_replacement") return repairCopy.noteNoReplacement;
  if (note === "budget_repair_route_preserved") return repairCopy.noteRoutePreserved;
  if (note === "budget_repair_preserved_category_coverage") return repairCopy.noteCategoryCoverage;
  if (note === "budget_repair_completed_within_budget") return repairCopy.noteCompleted;
  if (note === "budget_repair_budget_gap_remaining") return repairCopy.noteGapRemaining;
  if (note === "budget_repair_not_needed") return repairCopy.noteNotNeeded;

  return getMessages(locale).plannerResult.reasonFallbackLabel;
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
  const regionLabelByKey = useMemo(
    () =>
      new Map(
        normalizedDestinations.map((destination) => [destination.regionKey, destination.regionLabel])
      ),
    [normalizedDestinations]
  );
  const getRegionLabel = (regionKey: string) =>
    regionLabelByKey.get(regionKey as DatasetRegionKey) ?? regionKey;

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
    () => Array.from(new Set(finalItinerary.days.map((day) => getRegionLabel(day.region)))),
    [finalItinerary.days, regionLabelByKey]
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

  const budgetStatusTone = getBudgetStatusTone(
    persistedCostBreakdown.withinBudget,
    persistedCostBreakdown.totalCostOmr,
    persistedCostBreakdown.budgetThresholdOmr
  );
  const budgetStatusLabel =
    budgetStatusTone === "healthy"
      ? messages.plannerResult.budgetStatusHealthy
      : budgetStatusTone === "watch"
        ? messages.plannerResult.budgetStatusWatch
        : messages.plannerResult.budgetStatusCritical;

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
      value: budgetStatusLabel,
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
        categories: (destination?.categories ?? []).map((category) => ({
          id: category,
          label: getCategoryLabel(category, locale)
        })),
        travelKmFromPrevious: stop.travelKmFromPrevious,
        reasonLabels: Array.from(
          new Set(stop.topContributors.slice(0, 2).map((item) => getReasonLabel(item.reasonCode, locale)))
        )
      };
    });
  }, [destinationBySlug, locale, selectedDay]);

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

  const handleDayTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (finalItinerary.days.length === 0) {
      return;
    }

    const lastIndex = finalItinerary.days.length - 1;
    let nextIndex = currentIndex;
    const moveForwardKey = locale === "ar" ? "ArrowLeft" : "ArrowRight";
    const moveBackwardKey = locale === "ar" ? "ArrowRight" : "ArrowLeft";

    if (event.key === moveForwardKey || event.key === "ArrowDown") {
      event.preventDefault();
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === moveBackwardKey || event.key === "ArrowUp") {
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
  const repairCopy = getRepairCopy(locale);
  const repairStatusLabel = !finalItinerary.repairSummary.repairTriggered
    ? repairCopy.statusNotNeeded
    : persistedCostBreakdown.withinBudget
      ? repairCopy.statusRecovered
      : repairCopy.statusUnresolved;
  const repairStatusToneClass = !finalItinerary.repairSummary.repairTriggered
    ? "plannerBadge plannerBadgeNeutral"
    : persistedCostBreakdown.withinBudget
      ? "plannerBadge plannerBadgeSuccess"
      : "plannerBadge plannerBadgeCritical";
  const repairNoteLabels = finalItinerary.repairSummary.repairNotes.map((note) =>
    getRepairNoteLabel(note, locale)
  );
  const repairStatusMessage = !finalItinerary.repairSummary.repairTriggered
    ? formatMessage(messages.plannerResult.whyBudgetNoRepair, {
        status: persistedCostBreakdown.withinBudget
          ? messages.plannerResult.withinBudgetYes
          : messages.plannerResult.withinBudgetNo
      })
    : finalItinerary.repairSummary.actions.length > 0
      ? formatMessage(messages.plannerResult.whyBudgetWithRepair, {
          count: formatNumber(finalItinerary.repairSummary.actions.length, locale),
          savings: formatTicketCost(repairSavings, locale),
          status: persistedCostBreakdown.withinBudget
            ? messages.plannerResult.withinBudgetYes
            : messages.plannerResult.withinBudgetNo
        })
      : formatMessage(repairCopy.attempted, {
          status: persistedCostBreakdown.withinBudget
            ? messages.plannerResult.withinBudgetYes
            : messages.plannerResult.withinBudgetNo
        });
  const costBarMax = Math.max(
    persistedCostBreakdown.totalCostOmr,
    persistedCostBreakdown.budgetThresholdOmr,
    1
  );
  const costSegments = [
    {
      key: "fuel",
      label: messages.plannerResult.costFuel,
      value: persistedCostBreakdown.fuelCostOmr,
      colorClass: "plannerCostSegmentFuel"
    },
    {
      key: "tickets",
      label: messages.plannerResult.costTickets,
      value: persistedCostBreakdown.ticketsCostOmr,
      colorClass: "plannerCostSegmentTickets"
    },
    {
      key: "food",
      label: messages.plannerResult.costFood,
      value: persistedCostBreakdown.foodCostOmr,
      colorClass: "plannerCostSegmentFood"
    },
    {
      key: "hotel",
      label: messages.plannerResult.costHotel,
      value: persistedCostBreakdown.hotelCostOmr,
      colorClass: "plannerCostSegmentHotel"
    }
  ].map((segment) => ({
    ...segment,
    width: `${(segment.value / costBarMax) * 100}%`,
    share: `${formatNumber(Math.round((segment.value / Math.max(persistedCostBreakdown.totalCostOmr, 1)) * 100), locale)}%`
  }));
  const costThresholdLeft = `${Math.min((persistedCostBreakdown.budgetThresholdOmr / costBarMax) * 100, 100)}%`;
  const whyBullets = [
    formatMessage(messages.plannerResult.whyRegionBody, {
      region: getRegionLabel(selectedDay?.region ?? finalItinerary.days[0]?.region ?? "oman"),
      count: formatNumber(selectedRegionCandidateCount, locale),
      dayNumber: formatNumber(selectedDay?.dayNumber ?? 1, locale),
      factors: selectedDayReasonLabels.length > 0
        ? formatList(selectedDayReasonLabels, locale)
        : messages.plannerResult.reasonFallbackLabel
    }),
    repairStatusMessage,
    ...selectionFactors.slice(0, 3)
  ];

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
              {card.label === messages.plannerResult.overviewBudgetStatus ? (
                <span className={getBudgetStatusClass(budgetStatusTone)}>{budgetStatusLabel}</span>
              ) : null}
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
                    style={
                      {
                        "--planner-region-solid": getRegionAccent(day.region).solid,
                        "--planner-region-soft": getRegionAccent(day.region).soft
                      } as CSSProperties
                    }
                  >
                    <span className="plannerDayTabTopline">
                      <span className="plannerRegionDot" aria-hidden="true" />
                      <span>{formatMessage(messages.plannerResult.dayTabLabel, {
                        dayNumber: formatNumber(day.dayNumber, locale)
                      })}</span>
                    </span>
                    <small>{getRegionLabel(day.region)}</small>
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
                          region: getRegionLabel(selectedDay.region),
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
                        <strong>{getRegionLabel(selectedDay.region)}</strong>
                      </div>
                      <div className="plannerSummaryStat">
                        <span>{messages.plannerResult.daySummaryDistance}</span>
                        <strong>
                          {formatDecimal(selectedDay.estimatedTravelKm, locale, 1)} {messages.common.distanceUnitShort}
                        </strong>
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
                                <span className="plannerCrowdSummary" aria-label={messages.plannerResult.stopCrowd}>
                                  <span>{getCrowdLabel(stop.crowdLevel, locale)}</span>
                                  <span className="plannerCrowdDots" aria-hidden="true">
                                    {getCrowdDots(stop.crowdLevel).map((active, index) => (
                                      <span
                                        key={`${stop.slug}-crowd-${index + 1}`}
                                        className={active ? "plannerCrowdDot plannerCrowdDotActive" : "plannerCrowdDot"}
                                      />
                                    ))}
                                  </span>
                                </span>
                              </div>

                              <div className="plannerChipRow">
                                {stop.categories.map((category) => (
                                  <span
                                    key={`${stop.slug}-${category.id}`}
                                    className={`plannerChip plannerCategoryChip plannerCategoryChip${category.id[0]?.toUpperCase() ?? ""}${category.id.slice(1)}`}
                                  >
                                    {category.label}
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

                    <div className="plannerChipRow">
                      <span className={repairStatusToneClass}>{repairStatusLabel}</span>
                      <span className={getBudgetStatusClass(budgetStatusTone)}>{budgetStatusLabel}</span>
                    </div>

                    <ul className="plannerWhyList">
                      {whyBullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                      {repairNoteLabels.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
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
                      <span className={getBudgetStatusClass(budgetStatusTone)}>{budgetStatusLabel}</span>
                    </div>
                    <div className="plannerCostHero">
                      <strong>{formatTicketCost(persistedCostBreakdown.totalCostOmr, locale)}</strong>
                      <span>
                        {formatMessage(messages.plannerResult.overviewBudgetMeta, {
                          threshold: formatTicketCost(persistedCostBreakdown.budgetThresholdOmr, locale)
                        })}
                      </span>
                    </div>
                    <div className="plannerCostBarShell" aria-hidden="true">
                      <div className="plannerCostBar">
                        {costSegments.map((segment) => (
                          <span
                            key={segment.key}
                            className={`plannerCostSegment ${segment.colorClass}`}
                            style={{ width: segment.width }}
                          />
                        ))}
                        <span
                          className="plannerCostThreshold"
                          style={{ insetInlineStart: costThresholdLeft }}
                        />
                      </div>
                      <div
                        className="plannerCostThresholdLabel"
                        style={{ insetInlineStart: costThresholdLeft }}
                      >
                        {messages.plannerResult.costThreshold}
                      </div>
                    </div>
                    <div className="plannerInfoStack">
                      {costSegments.map((segment) => (
                        <div key={segment.key} className="plannerInfoRow plannerCostLine">
                          <span className="plannerCostLineLabel">
                            <span className={`plannerCostSwatch ${segment.colorClass}`} aria-hidden="true" />
                            {segment.label}
                          </span>
                          <strong>
                            {formatTicketCost(segment.value, locale)} <small>{segment.share}</small>
                          </strong>
                        </div>
                      ))}
                      <div className="plannerInfoRow plannerCostTotalsRow">
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

        <footer className="plannerFooter">
          <p>{messages.plannerResult.footerNote}</p>
        </footer>
      </div>
    </main>
  );
}
