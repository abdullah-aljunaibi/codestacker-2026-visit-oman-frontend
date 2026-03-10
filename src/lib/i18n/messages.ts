import ar from "@/lib/i18n/messages/ar.json";
import en from "@/lib/i18n/messages/en.json";
import type { Locale } from "@/types/dataset";
import type { BudgetLevel, InterestProfile } from "@/types/domain";

const dictionaries = {
  en,
  ar
} as const;

export type Messages = (typeof dictionaries)[Locale];
export type DiscoverySort = "crowd_asc" | "cost_asc" | "duration_asc";

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function getCategoryLabel(category: string, locale: Locale): string {
  const messages = getMessages(locale);
  return messages.categories[category as keyof Messages["categories"]] ?? category;
}

export function getMonthLabel(month: number, locale: Locale): string {
  const messages = getMessages(locale);
  return messages.months[month - 1] ?? String(month);
}

export function getBudgetLabel(budget: BudgetLevel, locale: Locale): string {
  return getMessages(locale).budget[budget];
}

export function getPaceLabel(pace: InterestProfile["pace"], locale: Locale): string {
  return getMessages(locale).pace[pace];
}

export function getSortLabel(sort: DiscoverySort, locale: Locale): string {
  return getMessages(locale).sort[sort];
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  const localeTag = locale === "ar" ? "ar" : "en";
  return new Intl.NumberFormat(localeTag, options).format(value);
}

export function formatDecimal(
  value: number,
  locale: Locale,
  fractionDigits: number
): string {
  return formatNumber(value, locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

export function formatTicketCost(value: number, locale: Locale): string {
  const messages = getMessages(locale);
  return `${formatNumber(value, locale)} ${messages.common.omr}`;
}
