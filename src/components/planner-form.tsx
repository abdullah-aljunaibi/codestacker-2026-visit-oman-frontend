"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { readSavedInterestSlugs } from "@/lib/persistence/interests";
import {
  defaultPlannerDraft,
  type PlannerDraft,
  readPlannerDraft,
  writePlannerDraft
} from "@/lib/persistence/planner-draft";
import { resolveLocale } from "@/lib/i18n/config";
import {
  getBudgetLabel,
  getCategoryLabel,
  getMessages,
  getMonthLabel,
  getPaceLabel
} from "@/lib/i18n/messages";

export function PlannerForm({
  locale,
  allTags,
  destinationOptions,
  focusSlug
}: {
  locale: string;
  allTags: string[];
  destinationOptions: Array<{ slug: string; name: string }>;
  focusSlug?: string;
}) {
  const normalizedLocale = resolveLocale(locale);
  const messages = getMessages(normalizedLocale);
  const router = useRouter();

  const [draft, setDraft] = useState<PlannerDraft>(defaultPlannerDraft);
  const [savedNotice, setSavedNotice] = useState("");

  useEffect(() => {
    const persisted = readPlannerDraft();
    const savedSlugs = readSavedInterestSlugs();

    const nextSelected = Array.from(
      new Set([
        ...persisted.selectedDestinationSlugs,
        ...savedSlugs,
        ...(focusSlug ? [focusSlug] : [])
      ])
    );

    setDraft({
      ...persisted,
      selectedDestinationSlugs: nextSelected
    });
  }, [focusSlug]);

  const savedCount = useMemo(() => draft.selectedDestinationSlugs.length, [draft]);

  return (
    <section className="card">
      <h1>{messages.plannerForm.title}</h1>
      <p>{messages.plannerForm.body}</p>

      <form
        className="plannerForm"
        onSubmit={(event) => {
          event.preventDefault();
          writePlannerDraft(draft);
          setSavedNotice(messages.plannerForm.savedNotice);
          router.push(`/${normalizedLocale}/planner/result`);
        }}
      >
        <label>
          {messages.plannerForm.days}
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
          {messages.plannerForm.budget}
          <select
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
          {messages.plannerForm.pace}
          <select
            value={draft.pace}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                pace: event.target.value as PlannerDraft["pace"]
              }))
            }
          >
            <option value="relaxed">{getPaceLabel("relaxed", normalizedLocale)}</option>
            <option value="balanced">{getPaceLabel("balanced", normalizedLocale)}</option>
            <option value="packed">{getPaceLabel("packed", normalizedLocale)}</option>
          </select>
        </label>

        <label>
          {messages.plannerForm.month}
          <select
            value={draft.travelMonth ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                travelMonth: event.target.value ? Number(event.target.value) : undefined
              }))
            }
          >
            <option value="">{messages.common.notSpecified}</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {getMonthLabel(month, normalizedLocale)}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>{messages.plannerForm.themes}</legend>
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
                <span>{getCategoryLabel(tag, normalizedLocale)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>
            {messages.plannerForm.picks} ({savedCount})
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
            {messages.plannerForm.submit}
          </button>
          <Link className="pill" href={`/${normalizedLocale}/saved`}>
            {messages.plannerForm.manageSaved}
          </Link>
          <Link className="pill" href={`/${normalizedLocale}/discover`}>
            {messages.common.backToDiscovery}
          </Link>
        </div>
      </form>

      {savedNotice ? <p className="listHeader">{savedNotice}</p> : null}
    </section>
  );
}
