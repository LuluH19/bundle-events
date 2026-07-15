import { HotelMapItem, HotelProvider, HotelSearchCriteria } from "@/src/types";
import { getDaysDiff } from "@/src/utils/date";
import { liteApiConfig } from "@/src/config";

type LiteApiHotelMeta = {
  id: string;
  name?: string;
  main_photo?: string;
  address?: string;
  city_name?: string;
  latitude?: number;
  longitude?: number;
  stars?: number;
  rating?: number;
};

type LiteApiRate = {
  hotelId: string;
  roomTypes?: {
    offerRetailRate?: { amount?: number; currency?: string };
    rates?: { retailRate?: { total?: { amount?: number; currency?: string }[] } }[];
  }[];
};

export class LiteApiHotelAdapter implements HotelProvider {
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
          maxRatesPerHotel: 1,
          includeHotelData: true,
        }),
      });

      if (!res.ok) {
        console.error("LiteAPI rates error:", res.status, await res.text());
        return [];
      }
      const data = await res.json();
      const rates: LiteApiRate[] = data.data || [];
      if (!rates.length) return [];

      // Hotel metadata (name/photo/coords/stars/rating) comes straight from the
      // same rates response under `data.hotels[]` (keyed by id === rate.hotelId),
      // so we don't fire a separate /data/hotel call per hotel.
      const meta = new Map<string, LiteApiHotelMeta>(
        ((data.hotels || []) as LiteApiHotelMeta[]).map((h) => [h.id, h])
      );

      return rates
        .map((h) => {
          const detail = meta.get(h.hotelId);
          let price: number | undefined;
          let currency = "EUR";
          for (const rt of h.roomTypes || []) {
            if (rt.offerRetailRate?.amount) {
              const p = Number(rt.offerRetailRate.amount);
              if (!price || p < price) {
                price = p;
                currency = rt.offerRetailRate.currency || "EUR";
              }
            }
            for (const rate of rt.rates || []) {
              const total = rate.retailRate?.total?.[0];
              if (total?.amount) {
                const p = Number(total.amount);
                if (!price || p < price) {
                  price = p;
                  currency = total.currency || "EUR";
                }
              }
            }
          }

          return {
            id: `lite-${h.hotelId}`,
            name: detail?.name || h.hotelId,
            locationName: [detail?.address, detail?.city_name].filter(Boolean).join(", "),
            coords: {
              lat: detail?.latitude ?? Number(lat),
              lng: detail?.longitude ?? Number(lng),
            },
            stars: detail?.stars,
            photo: detail?.main_photo,
            pricePerNight: price ? Math.round(price / getDaysDiff(checkin, checkout)) : undefined,
            currency,
            rating: detail?.rating,
            type: "hotel",
            source: "liteapi" as const,
          };
        })
        .filter((h: HotelMapItem) => h.name !== h.id.replace("lite-", "") && h.pricePerNight != null);
    } catch {
      return [];
    }
  }
}
