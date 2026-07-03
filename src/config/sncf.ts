export const sncfConfig = {
  apiKey: process.env.SNCF_API_KEY || "",
  baseUrl: "https://api.sncf.com/v1",
  stationCacheTtl: 24 * 60 * 60 * 1000, // 24 hours
  geometryCacheTtl: 30 * 60 * 1000,    // 30 minutes
} as const;
