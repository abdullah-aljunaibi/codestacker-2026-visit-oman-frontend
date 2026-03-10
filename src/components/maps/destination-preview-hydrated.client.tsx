"use client";

import dynamic from "next/dynamic";

const DestinationPreviewMap = dynamic(
  () => import("@/components/maps/destination-preview-map.client"),
  { ssr: false }
);

interface DestinationPreviewHydratedProps {
  lat: number;
  lng: number;
  title: string;
}

export function DestinationPreviewHydrated(props: DestinationPreviewHydratedProps) {
  return <DestinationPreviewMap {...props} />;
}
