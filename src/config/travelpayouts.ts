export const travelpayoutsConfig = {
  apiKey: process.env.TRAVEL_PAYOUTS_API_KEY || "",
  baseUrl: "https://api.travelpayouts.com/aviasales/v3",
} as const;
