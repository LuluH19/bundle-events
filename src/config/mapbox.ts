export const mapboxConfig = {
  token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "",
  baseUrl: "https://api.mapbox.com/search/geocode/v6",
  defaultLanguage: "fr",
} as const;
