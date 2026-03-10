import { PlannerForm } from "@/components/planner-form";
import { SiteHeader } from "@/components/site-header";
import { loadDestinations } from "@/lib/data/load-destinations";
import { getCategoryOptions } from "@/lib/data/selectors";
import { resolveLocale } from "@/lib/i18n/config";

export default async function PlannerPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const destinations = loadDestinations();
  const allTags = getCategoryOptions(destinations, locale).map((option) => option.value);
  const focusSlug = pickOne(resolvedSearchParams?.focus);

  const destinationOptions = destinations.map((destination) => ({
    slug: destination.slug,
    name: destination.name[locale]
  }));

  return (
    <main className="page">
      <div className="shell">
        <SiteHeader locale={locale} />
        <PlannerForm
          locale={locale}
          allTags={allTags}
          destinationOptions={destinationOptions}
          focusSlug={focusSlug}
        />
      </div>
    </main>
  );
}

function pickOne(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}
