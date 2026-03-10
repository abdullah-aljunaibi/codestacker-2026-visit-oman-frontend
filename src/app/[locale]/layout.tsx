import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentLocale } from "@/components/document-locale";
import { isSupportedLocale, localeDirection } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/types/dataset";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale: Locale = isSupportedLocale(locale) ? locale : "en";
  const messages = getMessages(resolvedLocale);

  return {
    title: messages.app.title,
    description: messages.app.description,
    alternates: {
      languages: {
        en: "/en",
        ar: "/ar"
      }
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  return (
    <>
      <DocumentLocale locale={locale} />
      <div dir={localeDirection[locale]} className="pageRoot">
        {children}
      </div>
    </>
  );
}
