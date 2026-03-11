import Link from "next/link";

import type { Locale } from "@/types/dataset";

export function MobileCtaBar({ locale }: { locale: Locale }) {
  return (
    <div className="mobileCtaBar">
      <div className="mobileCtaBarInner">
        <Link className="pill" href={`/${locale}/discover`}>
          {locale === "ar" ? "الوجهات" : "Discover"}
        </Link>
        <Link className="pill pillPrimary" href={`/${locale}/planner`}>
          {locale === "ar" ? "ابدأ التخطيط" : "Start planning"}
        </Link>
      </div>
    </div>
  );
}
