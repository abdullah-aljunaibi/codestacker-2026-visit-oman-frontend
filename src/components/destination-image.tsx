import Image from "next/image";

import { createBlurDataUrl } from "@/lib/ui/image-placeholders";
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
  const blurDataURL =
    destination.heroImage.theme === "desert"
      ? createBlurDataUrl("#8a5f3f", "#ddb583")
      : destination.heroImage.theme === "sea"
        ? createBlurDataUrl("#215f74", "#9cd4d9")
        : destination.heroImage.theme === "culture" || destination.heroImage.theme === "heritage"
          ? createBlurDataUrl("#5f4c3f", "#dec5a7")
          : createBlurDataUrl("#35695a", "#b9d7c7");

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
        placeholder="blur"
        blurDataURL={blurDataURL}
      />
    </div>
  );
}
