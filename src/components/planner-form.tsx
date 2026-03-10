"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { resolveLocale } from "@/lib/i18n/config";
import {
  getMessages,
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
  const messages = getMessages(normalizedLocale);
  const router = useRouter();
  const copy = messages.plannerForm;

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

  const isDraftComplete =
    draft.tripDurationDays >= 1 &&
    draft.tripDurationDays <= 7 &&
    draft.travelMonth >= 1 &&
    draft.travelMonth <= 12 &&
    (draft.budget === "budget" || draft.budget === "moderate" || draft.budget === "luxury") &&
    (draft.travelIntensity === "relaxed" ||
      draft.travelIntensity === "balanced" ||
      draft.travelIntensity === "packed") &&
    draft.preferredCategories.length > 0;

  return (
    <section className="card">
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      <p>{copy.savedHint}</p>

      <form
        className="plannerForm"
        onSubmit={(event) => {
          event.preventDefault();

          if (!isDraftComplete) {
            setSavedNotice("");
            setValidationMessage(
              draft.preferredCategories.length === 0
                ? copy.validationCategories
                : copy.validationRequired
            );
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
            required
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
            required
            value={draft.budget}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                budget: event.target.value as PlannerDraft["budget"]
              }))
            }
          >
            <option value="budget">{getBudgetLabel("budget", normalizedLocale)}</option>
            <option value="moderate">{getBudgetLabel("moderate", normalizedLocale)}</option>
            <option value="luxury">{getBudgetLabel("luxury", normalizedLocale)}</option>
          </select>
        </label>

        <label>
          {copy.pace}
          <select
            required
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
            required
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
          <legend>{copy.themes}</legend>
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
