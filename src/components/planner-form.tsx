"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { resolveLocale } from "@/lib/i18n/config";
import {
  getBudgetLabel,
  getMonthLabel,
  getTravelIntensityLabel
} from "@/lib/i18n/messages";
import { readSavedInterestSlugs } from "@/lib/persistence/interests";
import {
  defaultPlannerDraft,
  type PlannerDraft,
  readPlannerDraft,
  writePlannerDraft
} from "@/lib/persistence/planner-draft";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function deriveDefaultCategories(
  destinationOptions: Array<{ slug: string; categories: string[] }>,
  savedSlugs: string[],
  focusSlug?: string
): string[] {
  const sourceSlugs = unique([...savedSlugs, ...(focusSlug ? [focusSlug] : [])]);
  return unique(
    sourceSlugs.flatMap((slug) => {
      const destination = destinationOptions.find((option) => option.slug === slug);
      return destination?.categories ?? [];
    })
  );
}

export function PlannerForm({
  locale,
  categoryOptions,
  destinationOptions,
  focusSlug
}: {
  locale: string;
  categoryOptions: Array<{ value: string; label: string }>;
  destinationOptions: Array<{ slug: string; name: string; categories: string[] }>;
  focusSlug?: string;
}) {
  const normalizedLocale = resolveLocale(locale);
  const router = useRouter();
  const copy =
    normalizedLocale === "ar"
      ? {
          title: "إدخال المخطط",
          body:
            "اختر مدخلات الرحلة الدقيقة التي يستخدمها المخطط. مدة الرحلة والميزانية وشهر السفر وكثافة الرحلة والفئات المفضلة تؤثر مباشرة في البرنامج.",
          savedHint:
            "تؤثر الوجهات المحفوظة في اختيار الفئات الافتراضي، ويمكنك تعديل الفئات يدوياً في أي وقت.",
          days: "مدة الرحلة",
          budget: "فئة الميزانية",
          travelIntensity: "كثافة الرحلة",
          month: "شهر السفر",
          categories: "الفئات المفضلة",
          validationCategories: "اختر فئة مفضلة واحدة على الأقل.",
          submit: "حفظ المدخلات والمتابعة",
          savedNotice: "تم حفظ المدخلات محلياً.",
          manageSaved: "إدارة الاهتمامات",
          backToDiscovery: "العودة إلى الاكتشاف"
        }
      : {
          title: "Planner input",
          body:
            "Choose the exact trip inputs used by the planner. Duration, budget, travel month, intensity, and preferred categories directly affect the itinerary.",
          savedHint:
            "Saved destinations shape the default category selection. You can still edit the categories manually.",
          days: "Trip duration",
          budget: "Budget tier",
          travelIntensity: "Travel intensity",
          month: "Travel month",
          categories: "Preferred categories",
          validationCategories: "Select at least one preferred category.",
          submit: "Save inputs and continue",
          savedNotice: "Inputs saved locally.",
          manageSaved: "Manage saved interests",
          backToDiscovery: "Back to discovery"
        };

  const [draft, setDraft] = useState<PlannerDraft>(defaultPlannerDraft);
  const [savedNotice, setSavedNotice] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    const persisted = readPlannerDraft();
    const savedSlugs = readSavedInterestSlugs();
    const derivedCategories = deriveDefaultCategories(destinationOptions, savedSlugs, focusSlug);

    setDraft({
      ...persisted,
      preferredCategories:
        persisted.preferredCategories.length > 0 ? persisted.preferredCategories : derivedCategories
    });
  }, [destinationOptions, focusSlug]);

  return (
    <section className="card">
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      <p>{copy.savedHint}</p>

      <form
        className="plannerForm"
        onSubmit={(event) => {
          event.preventDefault();

          if (draft.preferredCategories.length === 0) {
            setValidationMessage(copy.validationCategories);
            return;
          }

          writePlannerDraft(draft);
          setValidationMessage("");
          setSavedNotice(copy.savedNotice);
          router.push(`/${normalizedLocale}/planner/result`);
        }}
      >
        <label>
          {copy.days}
          <select
            value={draft.tripDurationDays}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                tripDurationDays: Math.max(1, Math.min(7, Number(event.target.value || 1))) as PlannerDraft["tripDurationDays"]
              }))
            }
          >
            {Array.from({ length: 7 }, (_, index) => index + 1).map((dayCount) => (
              <option key={dayCount} value={dayCount}>
                {dayCount}
              </option>
            ))}
          </select>
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
            <option value="low">{getBudgetLabel("low", normalizedLocale)}</option>
            <option value="medium">{getBudgetLabel("medium", normalizedLocale)}</option>
            <option value="luxury">{getBudgetLabel("luxury", normalizedLocale)}</option>
          </select>
        </label>

        <label>
          {copy.travelIntensity}
          <select
            value={draft.travelIntensity}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                travelIntensity: event.target.value as PlannerDraft["travelIntensity"]
              }))
            }
          >
            <option value="relaxed">{getTravelIntensityLabel("relaxed", normalizedLocale)}</option>
            <option value="balanced">{getTravelIntensityLabel("balanced", normalizedLocale)}</option>
            <option value="packed">{getTravelIntensityLabel("packed", normalizedLocale)}</option>
          </select>
        </label>

        <label>
          {copy.month}
          <select
            value={draft.travelMonth}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                travelMonth: Math.max(1, Math.min(12, Number(event.target.value || 1)))
              }))
            }
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {getMonthLabel(month, normalizedLocale)}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>{copy.categories}</legend>
          <div className="checkGrid">
            {categoryOptions.map((category) => (
              <label key={category.value} className="checkItem">
                <input
                  type="checkbox"
                  checked={draft.preferredCategories.includes(category.value)}
                  onChange={() =>
                    setDraft((current) => ({
                      ...current,
                      preferredCategories: current.preferredCategories.includes(category.value)
                        ? current.preferredCategories.filter((item) => item !== category.value)
                        : [...current.preferredCategories, category.value]
                    }))
                  }
                />
                <span>{category.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="ctaRow">
          <button className="pill pillPrimary" type="submit">
            {copy.submit}
          </button>
          <Link className="pill" href={`/${normalizedLocale}/saved`}>
            {copy.manageSaved}
          </Link>
          <Link className="pill" href={`/${normalizedLocale}/discover`}>
            {copy.backToDiscovery}
          </Link>
        </div>
      </form>

      {validationMessage ? <p className="listHeader">{validationMessage}</p> : null}
      {savedNotice ? <p className="listHeader">{savedNotice}</p> : null}
    </section>
  );
}
