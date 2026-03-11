import Link from "next/link";

import { DestinationImage } from "@/components/destination-image";
import { regionAccentByKey } from "@/lib/data/immersive-showcase";
import { formatTicketCost, getMessages } from "@/lib/i18n/messages";
import type { Destination } from "@/types/domain";
import type { Locale } from "@/types/dataset";

function crowdDots(level: number) {
  return Array.from({ length: 5 }, (_, index) => index < level);
}

export function DestinationCard({
  destination,
  locale,
  className = "",
  priority = false,
  action
}: {
  destination: Destination;
  locale: Locale;
  className?: string;
  priority?: boolean;
  action?: React.ReactNode;
}) {
  const messages = getMessages(locale);
  const classes = ["destinationCard", className].filter(Boolean).join(" ");

  return (
    <article className={classes} data-reveal-child>
      <Link href={`/${locale}/discover/${destination.slug}`} className="destinationCardImageLink">
        <DestinationImage
          destination={destination}
          locale={locale}
          priority={priority}
          className="destinationImage destinationImageCard"
        />
      </Link>

      <div className="destinationCardBody">
        <div className="destinationCardHeader">
          <span
            className="destinationRegionBadge"
            style={{ "--region-accent": regionAccentByKey[destination.regionKey] } as React.CSSProperties}
          >
            {destination.regionLabel}
          </span>
          <span className="destinationPriceBadge">{formatTicketCost(destination.ticket_cost_omr, locale)}</span>
        </div>

        <div className="destinationCardContent">
          <h3 className="destinationCardTitle">
            <Link href={`/${locale}/discover/${destination.slug}`}>{destination.name[locale]}</Link>
          </h3>

          <div
            className="destinationCrowd"
            aria-label={`${messages.common.crowdLevel} ${destination.crowd_level}/5`}
          >
            <span className="destinationCrowdLabel">{messages.common.crowdLevel}</span>
            <div className="crowdMeter">
              {crowdDots(destination.crowd_level).map((active, index) => (
                <span
                  key={`${destination.slug}-crowd-${index + 1}`}
                  className={active ? "crowdDot crowdDotActive" : "crowdDot"}
                />
              ))}
            </div>
          </div>
        </div>

        {action ? <div className="destinationCardAction">{action}</div> : null}
      </div>
    </article>
  );
}
