import { NextRequest } from "next/server";
import { flixbusQuote } from "@/src/adapters/prices";
import { pricesConfig } from "@/src/config";
import { memoize } from "@/src/lib/memo-cache";
import { PRICE_LEG_ERROR, priceLegKey, readPriceLeg } from "@/src/utils/price-leg";

export async function GET(request: NextRequest) {
  const leg = readPriceLeg(request.nextUrl.searchParams);
  if (!leg) return Response.json({ error: PRICE_LEG_ERROR }, { status: 400 });

  try {
    const quote = await memoize(`bus|${priceLegKey(leg)}`, pricesConfig.quoteCacheTtl, () => flixbusQuote(leg));
    return Response.json({ quote }, { headers: { "X-Data-Source": "flixbus" } });
  } catch (e) {
    console.warn("[prices/bus] no price:", (e as Error).message);
    return Response.json({ quote: null }, { headers: { "X-Data-Source": "none" } });
  }
}
