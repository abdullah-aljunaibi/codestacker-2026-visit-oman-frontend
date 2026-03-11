import Link from "next/link";

import type { Locale } from "@/types/dataset";

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy =
    locale === "ar"
      ? {
          brand: "زوروا عُمان",
          body: "من السواحل الهادئة إلى الجبال العالية، صممت لتخطيط رحلات تبدو مترفة وسهلة.",
          explore: "استكشف",
          discover: "الوجهات",
          planner: "مخطط الرحلة",
          saved: "المحفوظات",
          connect: "تواصل",
          newsletter: "النشرة البريدية",
          newsletterBody: "واجهة فقط حالياً لتلقي قصص السفر والعروض الموسمية.",
          email: "البريد الإلكتروني",
          subscribe: "اشترك",
          rights: "زوروا عُمان. جميع الحقوق محفوظة.",
          social: ["Instagram", "X", "YouTube"]
        }
      : {
          brand: "Visit Oman",
          body: "From quiet coastlines to high mountain air, designed for trip planning that feels premium and effortless.",
          explore: "Explore",
          discover: "Discover",
          planner: "Planner",
          saved: "Saved",
          connect: "Connect",
          newsletter: "Newsletter",
          newsletterBody: "UI placeholder for travel stories and seasonal dispatches.",
          email: "Email address",
          subscribe: "Subscribe",
          rights: "Visit Oman. All rights reserved.",
          social: ["Instagram", "X", "YouTube"]
        };

  return (
    <footer className="siteFooter">
      <div className="shell siteFooterGrid">
        <div className="siteFooterBrand">
          <Link className="brand brandLockup" href={`/${locale}`}>
            <span className="brandMark" aria-hidden="true" />
            {copy.brand}
          </Link>
          <p>{copy.body}</p>
        </div>

        <div className="siteFooterColumn">
          <h3>{copy.explore}</h3>
          <Link href={`/${locale}/discover`}>{copy.discover}</Link>
          <Link href={`/${locale}/planner`}>{copy.planner}</Link>
          <Link href={`/${locale}/saved`}>{copy.saved}</Link>
        </div>

        <div className="siteFooterColumn">
          <h3>{copy.connect}</h3>
          {copy.social.map((label) => (
            <a key={label} href="#" aria-label={label}>
              {label}
            </a>
          ))}
        </div>

        <form className="siteFooterColumn siteFooterNewsletter">
          <h3>{copy.newsletter}</h3>
          <p>{copy.newsletterBody}</p>
          <label className="siteFooterInputRow">
            <span className="srOnly">{copy.email}</span>
            <input type="email" placeholder={copy.email} />
          </label>
          <button type="button" className="pill pillPrimary">
            {copy.subscribe}
          </button>
        </form>
      </div>
      <div className="shell siteFooterMeta">
        <span>{copy.rights}</span>
      </div>
    </footer>
  );
}
