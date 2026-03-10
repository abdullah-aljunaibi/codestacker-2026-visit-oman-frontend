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
  clearPlannerDraft,
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

function getBudgetCardMeta(
  budget: PlannerDraft["budget"],
  locale: "en" | "ar",
  copy: ReturnType<typeof getMessages>["plannerForm"]
) {
  if (budget === "low") {
    return {
      icon: "$",
      hint: locale === "ar" ? "حتى 35 ر.ع. يومياً" : "Up to 35 OMR/day",
      body: copy.budgetHintLow
    };
  }

  if (budget === "medium") {
    return {
      icon: "$$",
      hint: locale === "ar" ? "35-80 ر.ع. يومياً" : "35-80 OMR/day",
      body: copy.budgetHintMedium
    };
  }

  return {
    icon: "$$$",
    hint: locale === "ar" ? "80+ ر.ع. يومياً" : "80+ OMR/day",
    body: copy.budgetHintLuxury
  };
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
  const budgetOptions: PlannerDraft["budget"][] = ["low", "medium", "luxury"];
  const dayOptions = Array.from({ length: 7 }, (_, index) => (index + 1) as PlannerDraft["tripDurationDays"]);

  const [draft, setDraft] = useState<PlannerDraft>(defaultPlannerDraft);
  const [savedNotice, setSavedNotice] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  function resetDraft() {
    const savedSlugs = readSavedInterestSlugs();
    const derivedCategories = deriveDefaultCategories(destinationOptions, savedSlugs, focusSlug);

    clearPlannerDraft();
    setDraft({
      ...defaultPlannerDraft,
      preferredCategories: derivedCategories
    });
    setSavedNotice("");
    setValidationMessage("");
  }

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
    (draft.budget === "low" || draft.budget === "medium" || draft.budget === "luxury") &&
    (draft.travelIntensity === "relaxed" ||
      draft.travelIntensity === "balanced" ||
      draft.travelIntensity === "packed") &&
    draft.preferredCategories.length > 0;

  return (
    <section className="card plannerFormCard">
      <div className="plannerFormIntro">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
        </div>
        <p>{copy.savedHint}</p>
      </div>

      <ol className="plannerStepIndicators" aria-label={copy.title}>
        <li className="plannerStepIndicator">
          <span className="plannerStepNumber">1</span>
          <div>
            <strong>{copy.stepChooseInterests}</strong>
            <span>{copy.themes}</span>
          </div>
        </li>
        <li className="plannerStepIndicator">
          <span className="plannerStepNumber">2</span>
          <div>
            <strong>{copy.stepSetDetails}</strong>
            <span>{copy.days}</span>
          </div>
        </li>
        <li className="plannerStepIndicator">
          <span className="plannerStepNumber">3</span>
          <div>
            <strong>{copy.stepGenerate}</strong>
            <span>{copy.generateTitle}</span>
          </div>
        </li>
      </ol>

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
        <section className="plannerStepCard">
          <div className="plannerStepCardHeader">
            <span className="plannerStepChip">1</span>
            <div>
              <h2>{copy.stepChooseInterests}</h2>
              <p>{copy.savedHint}</p>
            </div>
          </div>

          <fieldset>
            <legend>{copy.themes}</legend>
            <div className="checkGrid plannerInterestGrid">
              {categoryOptions.map((category) => (
                <label key={category.value} className="checkItem plannerInterestCard">
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
        </section>

        <section className="plannerStepCard">
          <div className="plannerStepCardHeader">
            <span className="plannerStepChip">2</span>
            <div>
              <h2>{copy.stepSetDetails}</h2>
              <p>{copy.body}</p>
            </div>
          </div>

          <div className="plannerBudgetBlock">
            <div className="plannerControlLabel">
              <strong>{copy.budget}</strong>
            </div>
            <div className="plannerBudgetGrid">
              {budgetOptions.map((budget) => {
                const meta = getBudgetCardMeta(budget, normalizedLocale, copy);
                const selected = draft.budget === budget;

                return (
                  <button
                    key={budget}
                    type="button"
                    className={selected ? "plannerBudgetCard plannerBudgetCardActive" : "plannerBudgetCard"}
                    aria-pressed={selected}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        budget
                      }))
                    }
                  >
                    <span className="plannerBudgetIcon" aria-hidden="true">
                      {meta.icon}
                    </span>
                    <strong>{getBudgetLabel(budget, normalizedLocale)}</strong>
                    <span>{meta.hint}</span>
                    <small>{meta.body}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="plannerTripDetailGrid">
            <div className="plannerSegmentBlock">
              <div className="plannerControlLabel">
                <strong>{copy.days}</strong>
                <span>{copy.daysHelp}</span>
              </div>
              <div className="plannerDaySegment" role="group" aria-label={copy.daysSegmentLabel}>
                {dayOptions.map((dayCount) => {
                  const selected = draft.tripDurationDays === dayCount;

                  return (
                    <button
                      key={dayCount}
                      type="button"
                      className={selected ? "plannerSegmentButton plannerSegmentButtonActive" : "plannerSegmentButton"}
                      aria-pressed={selected}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          tripDurationDays: dayCount
                        }))
                      }
                    >
                      {dayCount}
                    </button>
                  );
                })}
              </div>
            </div>

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
          </div>
        </section>

        <section className="plannerStepCard plannerGenerateCard">
          <div className="plannerStepCardHeader">
            <span className="plannerStepChip">3</span>
            <div>
              <h2>{copy.generateTitle}</h2>
              <p>{copy.generateBody}</p>
            </div>
          </div>

          <div className="plannerGenerateActions">
            <button className="plannerGenerateButton" type="submit">
              {copy.submit}
            </button>
            <button className="pill" type="button" onClick={resetDraft}>
              {copy.reset}
            </button>
            <Link className="pill" href={`/${normalizedLocale}/saved`}>
              {copy.manageSaved}
            </Link>
            <Link className="pill" href={`/${normalizedLocale}/discover`}>
              {copy.backToDiscovery}
            </Link>
          </div>
        </section>
      </form>

      {validationMessage ? <p className="listHeader">{validationMessage}</p> : null}
      {savedNotice ? <p className="listHeader">{savedNotice}</p> : null}
    </section>
  );
}
