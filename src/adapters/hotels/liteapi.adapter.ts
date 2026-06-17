import { HotelMapItem, HotelProvider, HotelSearchCriteria } from "@/src/types";
import { getDaysDiff } from "@/src/utils/date";
import { liteApiConfig } from "@/src/config";

export class LiteApiHotelAdapter implements HotelProvider {
  private async fetchHotelDetails(apiKey: string, hotelIds: string[]): Promise<Map<string, { name: string; address: string; city: string; zip: string; latitude: number; longitude: number; starRating: number; main_photo: string; rating: number }>> {
    const map = new Map();
    // Fetch in parallel (max 5 concurrent)
    const chunks = [];
    for (let i = 0; i < hotelIds.length; i += 5) {
      chunks.push(hotelIds.slice(i, i + 5));
    }
    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async (id) => {
          try {
            const res = await fetch(`${liteApiConfig.baseUrl}/data/hotel?hotelId=${id}`, {
              headers: { "X-API-Key": apiKey },
              signal: AbortSignal.timeout(liteApiConfig.timeoutMs),
            });
            if (!res.ok) return null;
            const data = await res.json();
            return { id, detail: data.data };
          } catch { return null; }
        })
      );
      for (const r of results) {
        if (r?.detail) map.set(r.id, r.detail);
      }
    }
    return map;
  }

  async searchHotels(criteria: HotelSearchCriteria): Promise<HotelMapItem[]> {
    const { lat, lng, radiusKm, checkin, checkout } = criteria;
    if (!checkin || !checkout) {
      return [];
    }

    const apiKey = liteApiConfig.apiKey;

    try {
      const res = await fetch(`${liteApiConfig.baseUrl}/hotels/rates`, {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(liteApiConfig.timeoutMs),
        body: JSON.stringify({
          latitude: Number(lat),
          longitude: Number(lng),
          radius: Number(radiusKm) * 1000,
          occupancies: [{ adults: 2 }],
          currency: "EUR",
          guestNationality: "FR",
          checkin,
          checkout,
          limit: 20,
          sort: "price",
        }),
      });

      if (!res.ok) return [];
      const data = await res.json();
      if (!data.data?.length) return [];

      // Fetch hotel details for each result
      const hotelIds: string[] = data.data.map((h: { hotelId: string }) => h.hotelId);
      const details = await this.fetchHotelDetails(apiKey, hotelIds);

      return data.data.map((h: { hotelId: string; roomTypes?: { offerRetailRate?: { amount?: number }; rates?: { retailRate?: { total?: { amount?: number; currency?: string }[] } }[] }[] }) => {
        const detail = details.get(h.hotelId);
        // Find cheapest rate
        let price: number | undefined;
        let currency = "EUR";
        for (const rt of h.roomTypes || []) {
          if (rt.offerRetailRate?.amount) {
            const p = Number(rt.offerRetailRate.amount);
            if (!price || p < price) { price = p; currency = "EUR"; }
          }
          for (const rate of rt.rates || []) {
            const total = rate.retailRate?.total?.[0];
            if (total?.amount) {
              const p = Number(total.amount);
              if (!price || p < price) { price = p; currency = total.currency || "EUR"; }
            }
          }
        }

        return {
          id: `lite-${h.hotelId}`,
          name: detail?.name || h.hotelId,
          locationName: [detail?.address, [detail?.zip, detail?.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
          coords: { lat: detail?.latitude || Number(lat), lng: detail?.longitude || Number(lng) },
          stars: detail?.starRating,
          photo: detail?.main_photo,
          pricePerNight: price ? Math.round(price / getDaysDiff(checkin, checkout)) : undefined,
          currency,
          rating: detail?.rating,
          type: "hotel",
          source: "liteapi" as const,
        };
      }).filter((h: HotelMapItem) => h.name !== h.id.replace("lite-", ""));
    } catch {
      return [];
    }
  }
}
