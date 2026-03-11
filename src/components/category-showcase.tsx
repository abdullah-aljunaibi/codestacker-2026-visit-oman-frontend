"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ShowcaseItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
  label: string;
};

export function CategoryShowcase({
  items,
  ariaLabel,
  ctaLabel
}: {
  items: ShowcaseItem[];
  ariaLabel: string;
  ctaLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const observerThresholds = useMemo(() => [0.25, 0.4, 0.55, 0.7], []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-showcase-panel]"));
    if (sections.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const nextIndex = Number(visibleEntry.target.getAttribute("data-index"));
        if (!Number.isNaN(nextIndex)) {
          setActiveIndex(nextIndex);
        }
      },
      {
        threshold: observerThresholds,
        rootMargin: "-18% 0px -18% 0px"
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [observerThresholds]);

  return (
    <section className="categoryShowcase" aria-label={ariaLabel}>
      <div className="categoryShowcaseVisual" aria-hidden="true">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`categoryShowcaseBackground${index === activeIndex ? " isActive" : ""}`}
          >
            <Image
              src={item.image}
              alt=""
              fill
              sizes="100vw"
              className="categoryShowcaseBackgroundImage"
              priority={index === 0}
            />
          </div>
        ))}
        <div className="categoryShowcaseVeil" />
      </div>

      <div className="categoryShowcaseScroller">
        {items.map((item, index) => (
          <article
            key={item.id}
            data-showcase-panel
            data-index={index}
            className="categoryShowcasePanel"
          >
            <div className="categoryShowcasePanelInner">
              <span className="categoryShowcaseEyebrow">{item.label}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <Link className="pill pillPrimary categoryShowcaseCta" href={item.href}>
                {ctaLabel}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
