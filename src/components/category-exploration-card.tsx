import Image from "next/image";
import Link from "next/link";

import { formatMessage, getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/types/dataset";

export function CategoryExplorationCard({
  locale,
  title,
  href,
  count,
  image
}: {
  locale: Locale;
  title: string;
  href: string;
  count: number;
  image: { src: string; blurDataURL: string };
}) {
  const messages = getMessages(locale);

  return (
    <Link href={`/${locale}/discover${href}`} className="categoryExplorationCard">
      <Image
        src={image.src}
        alt={title}
        fill
        className="categoryExplorationImage"
        sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 25vw"
        placeholder="blur"
        blurDataURL={image.blurDataURL}
      />
      <span className="categoryExplorationOverlay" />
      <div className="categoryExplorationContent">
        <span className="categoryCountBadge">{formatMessage(messages.home.destinationBadge, { count })}</span>
        <h3>{title}</h3>
      </div>
    </Link>
  );
}
