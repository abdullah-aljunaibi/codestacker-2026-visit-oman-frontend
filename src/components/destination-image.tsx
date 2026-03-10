import Image from "next/image";

import type { Destination } from "@/types/domain";
import type { Locale } from "@/types/dataset";

export function DestinationImage({
  destination,
  locale,
  priority = false,
  className = "destinationImage"
}: {
  destination: Destination;
  locale: Locale;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Image
        src={destination.heroImage.src}
        alt={destination.name[locale]}
        width={destination.heroImage.width}
        height={destination.heroImage.height}
        className="destinationImageMedia"
        sizes="(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        unoptimized
      />
    </div>
  );
}
