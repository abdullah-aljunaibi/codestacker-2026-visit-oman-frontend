import { PlannerForm } from "@/components/planner-form";
import { loadDestinations } from "@/lib/data/load-destinations";
import { getTags } from "@/lib/discovery/query";
import { localeDirection, resolveLocale } from "@/lib/i18n/config";

export default async function PlannerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  const destinations = loadDestinations();
  const allTags = getTags(destinations);

  const destinationOptions = destinations.map((destination) => ({
    slug: destination.slug,
    name: destination.name[locale]
  }));

  return (
    <main dir={localeDirection[locale]} className={locale === "ar" ? "ar" : undefined}>
      <div className="shell">
        <PlannerForm
          locale={locale}
          allTags={allTags}
          destinationOptions={destinationOptions}
        />
      </div>
    </main>
  );
}
