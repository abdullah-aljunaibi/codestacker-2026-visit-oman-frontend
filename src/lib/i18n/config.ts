import type { Locale } from "@/types/domain";

export const locales = ["en", "ar"] as const;
export const defaultLocale: Locale = "en";

export const localeDirection: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl"
};

export function isSupportedLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale);
}

export function resolveLocale(locale: string): Locale {
  return isSupportedLocale(locale) ? locale : defaultLocale;
}
