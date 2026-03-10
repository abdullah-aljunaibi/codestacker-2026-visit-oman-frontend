function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createBlurDataUrl(primary: string, secondary: string) {
  return svgToDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)" />
      <circle cx="230" cy="210" r="210" fill="rgba(255,255,255,0.18)" />
      <circle cx="980" cy="140" r="170" fill="rgba(255,255,255,0.12)" />
      <circle cx="930" cy="650" r="240" fill="rgba(10,77,92,0.18)" />
    </svg>`
  );
}
