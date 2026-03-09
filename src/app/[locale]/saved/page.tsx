import { SavedInterestsPanel } from "@/components/saved-interests-panel";
import { localeDirection, resolveLocale } from "@/lib/i18n/config";

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);

  return (
    <main dir={localeDirection[locale]} className={locale === "ar" ? "ar" : undefined}>
      <div className="shell">
        <SavedInterestsPanel locale={locale} />
      </div>
    </main>
  );
}
