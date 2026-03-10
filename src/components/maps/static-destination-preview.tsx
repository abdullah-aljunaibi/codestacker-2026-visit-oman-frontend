import { projectPointToOmanBox } from "@/components/maps/map-config";

interface StaticDestinationPreviewProps {
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
}

const width = 640;
const height = 360;

export function StaticDestinationPreview({
  lat,
  lng,
  title,
  subtitle
}: StaticDestinationPreviewProps) {
  const pin = projectPointToOmanBox(lat, lng, width, height);

  return (
    <div className="staticMapFrame" role="img" aria-label={`${title}. ${subtitle}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="staticMapSvg">
        <defs>
          <linearGradient id="oman-sea" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#f6efe0" />
            <stop offset="100%" stopColor="#deebe7" />
          </linearGradient>
          <linearGradient id="oman-land" x1="0%" x2="100%" y1="10%" y2="100%">
            <stop offset="0%" stopColor="#ecd6b4" />
            <stop offset="100%" stopColor="#d7b07b" />
          </linearGradient>
        </defs>

        <rect width={width} height={height} rx="24" fill="url(#oman-sea)" />
        <g opacity="0.24" stroke="#0b6f5b" strokeDasharray="8 10">
          <path d="M72 84 H568" />
          <path d="M72 156 H568" />
          <path d="M72 228 H568" />
          <path d="M72 300 H568" />
          <path d="M128 52 V316" />
          <path d="M256 52 V316" />
          <path d="M384 52 V316" />
          <path d="M512 52 V316" />
        </g>

        <path
          d="M177 88 C214 60 281 52 348 67 C414 82 478 121 487 172 C495 218 467 258 412 291 C355 325 283 316 236 286 C190 256 140 223 133 176 C127 136 146 108 177 88 Z"
          fill="url(#oman-land)"
          stroke="#a66f34"
          strokeWidth="4"
        />

        <path
          d="M466 117 C500 141 515 176 503 210 C490 248 454 279 405 298"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeLinecap="round"
          strokeWidth="8"
        />

        <g transform={`translate(${pin.x} ${pin.y})`}>
          <circle r="18" fill="rgba(11,111,91,0.16)" />
          <path
            d="M0 -24 C10 -24 18 -16 18 -6 C18 8 0 28 0 28 C0 28 -18 8 -18 -6 C-18 -16 -10 -24 0 -24 Z"
            fill="#0b6f5b"
          />
          <circle cy="-6" r="7" fill="#fff" />
        </g>
      </svg>
    </div>
  );
}
