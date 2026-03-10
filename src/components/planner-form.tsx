"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { readSavedInterestSlugs } from "@/lib/persistence/interests";
import {
  defaultPlannerDraft,
  type PlannerDraft,
  readPlannerDraft,
  writePlannerDraft
} from "@/lib/persistence/planner-draft";
import { resolveLocale } from "@/lib/i18n/config";

type PlannerFormCopy = {
  title: string;
  body: string;
  days: string;
  budget: string;
  pace: string;
  month: string;
  themes: string;
  picks: string;
  submit: string;
  saved: string;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function PlannerForm({
  locale,
  allTags,
  destinationOptions
}: {
  locale: string;
  allTags: string[];
  destinationOptions: Array<{ slug: string; name: string }>;
}) {
  const normalizedLocale = resolveLocale(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");

  const copy: PlannerFormCopy =
    normalizedLocale === "ar"
      ? {
          title: "إدخال المخطط",
          body: "حدد تفضيلاتك أولاً. سيتم استخدام هذه المدخلات في المرحلة التالية لتوليد الرحلة.",
          days: "عدد الأيام",
          budget: "الميزانية",
          pace: "الوتيرة",
          month: "شهر السفر",
          themes: "الأنماط المفضلة",
          picks: "الوجهات المهتم بها",
          submit: "حفظ المدخلات والمتابعة",
          saved: "تم حفظ المدخلات محلياً."
        }
      : {
          title: "Planner input",
          body: "Set your preferences now. These inputs will feed itinerary generation in Phase 4.",
          days: "Trip days",
          budget: "Budget",
          pace: "Pace",
          month: "Travel month",
          themes: "Preferred themes",
          picks: "Saved destinations to include",
          submit: "Save inputs and continue",
          saved: "Inputs saved locally."
        };

  const [draft, setDraft] = useState<PlannerDraft>(defaultPlannerDraft);
  const [savedNotice, setSavedNotice] = useState("");

  useEffect(() => {
    const persisted = readPlannerDraft();
    const savedSlugs = readSavedInterestSlugs();

    const nextSelected = Array.from(
      new Set([
        ...persisted.selectedDestinationSlugs,
        ...savedSlugs,
        ...(focus ? [focus] : [])
      ])
    );

    setDraft({
      ...persisted,
      selectedDestinationSlugs: nextSelected
    });
  }, [focus]);

  const savedCount = useMemo(() => draft.selectedDestinationSlugs.length, [draft]);

  return (
    <section className="card">
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>

      <form
        className="plannerForm"
        onSubmit={(event) => {
          event.preventDefault();
          writePlannerDraft(draft);
          setSavedNotice(copy.saved);
          router.push(`/${normalizedLocale}/planner/result`);
        }}
      >
        <label>
          {copy.days}
          <input
            type="number"
            min={1}
            max={21}
            value={draft.tripDays}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                tripDays: Math.max(1, Math.min(21, Number(event.target.value || 1)))
              }))
            }
          />
        </label>

        <label>
          {copy.budget}
          <select
            value={draft.budget}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                budget: event.target.value as PlannerDraft["budget"]
              }))
            }
          >
            <option value="budget">{normalizedLocale === "ar" ? "اقتصادية" : "Budget"}</option>
            <option value="moderate">{normalizedLocale === "ar" ? "متوسطة" : "Moderate"}</option>
            <option value="luxury">{normalizedLocale === "ar" ? "فاخرة" : "Luxury"}</option>
          </select>
        </label>

        <label>
          {copy.pace}
          <select
            value={draft.pace}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                pace: event.target.value as PlannerDraft["pace"]
              }))
            }
          >
            <option value="relaxed">{normalizedLocale === "ar" ? "هادئة" : "Relaxed"}</option>
            <option value="balanced">{normalizedLocale === "ar" ? "متوازنة" : "Balanced"}</option>
            <option value="packed">{normalizedLocale === "ar" ? "مكثفة" : "Packed"}</option>
          </select>
        </label>

        <label>
          {copy.month}
          <select
            value={draft.travelMonth ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                travelMonth: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          >
            <option value="">{normalizedLocale === "ar" ? "غير محدد" : "Not specified"}</option>
            {months.map((month, index) => (
              <option key={month} value={index + 1}>
                {normalizedLocale === "ar" ? `${index + 1}` : month}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>{copy.themes}</legend>
          <div className="checkGrid">
            {allTags.map((tag) => (
              <label key={tag} className="checkItem">
                <input
                  type="checkbox"
                  checked={draft.themes.includes(tag)}
                  onChange={() =>
                    setDraft((current) => ({
                      ...current,
                      themes: current.themes.includes(tag)
                        ? current.themes.filter((theme) => theme !== tag)
                        : [...current.themes, tag]
                    }))
                  }
                />
                <span>{tag}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>
            {copy.picks} ({savedCount})
          </legend>
          <div className="checkGrid">
            {destinationOptions.map((destination) => (
              <label key={destination.slug} className="checkItem">
                <input
                  type="checkbox"
                  checked={draft.selectedDestinationSlugs.includes(destination.slug)}
                  onChange={() =>
                    setDraft((current) => ({
                      ...current,
                      selectedDestinationSlugs: current.selectedDestinationSlugs.includes(destination.slug)
                        ? current.selectedDestinationSlugs.filter((slug) => slug !== destination.slug)
                        : [...current.selectedDestinationSlugs, destination.slug]
                    }))
                  }
                />
                <span>{destination.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="ctaRow">
          <button className="pill pillPrimary" type="submit">
            {copy.submit}
          </button>
          <Link className="pill" href={`/${normalizedLocale}/saved`}>
            {normalizedLocale === "ar" ? "إدارة الاهتمامات" : "Manage saved interests"}
          </Link>
          <Link className="pill" href={`/${normalizedLocale}/discover`}>
            {normalizedLocale === "ar" ? "عودة إلى الاكتشاف" : "Back to discovery"}
          </Link>
        </div>
      </form>

      {savedNotice ? <p className="listHeader">{savedNotice}</p> : null}
    </section>
  );
}
