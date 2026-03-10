import { SiteHeader } from "@/components/site-header";
import { SavedInterestsPanel } from "@/components/saved-interests-panel";
import { resolveLocale } from "@/lib/i18n/config";

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />
        <SavedInterestsPanel locale={locale} />
      </div>
    </main>
  );
}
