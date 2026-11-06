export const nominatimConfig = {
  baseUrl: "https://nominatim.openstreetmap.org",
  countryCodes: "fr",
  // Categories (OSM `class`) considered as event venues; drops shops, boards, etc.
  venueCategories: ["tourism", "leisure", "amenity", "building", "historic"],
} as const;
