export const mapboxConfig = {
  token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "",
  baseUrl: "https://api.mapbox.com/search/geocode/v6",
  searchBoxBaseUrl: "https://api.mapbox.com/search/searchbox/v1",
  // Metropolitan France (minLng,minLat,maxLng,maxLat): `country` alone still leaks foreign POIs
  franceBbox: "-5.5,41.2,9.8,51.2",
  defaultLanguage: "fr",
} as const;
