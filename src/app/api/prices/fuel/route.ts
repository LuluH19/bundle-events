import { fetchFuelPrices } from "@/src/adapters/prices";
import { pricesConfig } from "@/src/config";
import { memoize } from "@/src/lib/memo-cache";

export async function GET() {
  try {
    const prices = await memoize("fuel", pricesConfig.fuelCacheTtl, fetchFuelPrices);
    return Response.json({ pricePerLitre: (prices.gazole + prices.sp95) / 2, ...prices, source: "prix-carburants" });
  } catch (e) {
    console.warn("[prices/fuel] fallback price:", (e as Error).message);
    return Response.json({ pricePerLitre: pricesConfig.fallbackFuelPrice, source: "fallback" });
  }
}
