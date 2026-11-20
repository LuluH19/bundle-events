export const sncfConfig = {
  apiKey: process.env.SNCF_API_KEY || "",
  baseUrl: "https://api.sncf.com/v1",
} as const;
