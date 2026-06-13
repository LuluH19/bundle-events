export const overpassConfig = {
  mirrors: [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ],
  cacheTtl: 5 * 60 * 1000, // 5 minutes
  timeoutMs: 12000,
};
