"use client";

import { useEffect } from "react";

import { localeDirection } from "@/lib/i18n/config";
import type { Locale } from "@/types/dataset";

export function DocumentLocale({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection[locale];
  }, [locale]);

  return null;
}
