export const overpassConfig = {
  mirrors: [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ],
  /** Fallback search radius cap: public instances take 15-40 s even at 5 km. */
  maxRadiusKm: 5,
  timeoutMs: 25000,
  // overpass-api.de answers 406 to requests without an app-identifying User-Agent.
  userAgent: "bundle-events/1.0",
} as const;
