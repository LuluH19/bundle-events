import { NextRequest } from "next/server";
import type { PriceLeg } from "@/src/types";
import { sncfTariffQuote, trainlineQuote } from "@/src/adapters/prices";
import { pricesConfig } from "@/src/config";
import { memoize } from "@/src/lib/memo-cache";
import { firstSuccess } from "@/src/utils/fallback";
import { PRICE_LEG_ERROR, priceLegKey, readPriceLeg } from "@/src/utils/price-leg";

async function liveTrainline(leg: PriceLeg) {
  try {
    return await trainlineQuote(leg);
  } catch (e) {
    console.warn("[prices/train] Trainline unavailable, falling back to SNCF tariffs:", (e as Error).message);
    throw e;
  }
}

export async function GET(request: NextRequest) {
  const leg = readPriceLeg(request.nextUrl.searchParams);
  if (!leg) return Response.json({ error: PRICE_LEG_ERROR }, { status: 400 });

  try {
    const { source, value } = await memoize(`train|${priceLegKey(leg)}`, pricesConfig.quoteCacheTtl, () =>
      firstSuccess([
        { name: "trainline", run: () => liveTrainline(leg) },
        { name: "sncf-tariffs", run: () => sncfTariffQuote(leg) },
      ])
    );
    return Response.json({ quote: value }, { headers: { "X-Data-Source": source ?? "none" } });
  } catch (e) {
    console.warn("[prices/train] no price:", (e as Error).message);
    return Response.json({ quote: null }, { headers: { "X-Data-Source": "none" } });
  }
}
