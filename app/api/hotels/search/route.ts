import { NextRequest } from "next/server";

interface HotelResult {
  id: string;
  name: string;
  locationName: string;
  coords: { lat: number; lng: number };
  stars?: number;
  website?: string;
  phone?: string;
  type?: string;
  photo?: string;
  pricePerNight?: number;
  currency?: string;
  rating?: number;
  source: "liteapi";
}

async function searchLiteAPI(
  lat: string,
  lng: string,
  radiusKm: string,
  checkin: string,
  checkout: string
): Promise<HotelResult[]> {
  const apiKey = process.env.LITEAPI_KEY || "sand_c0155ab8-c683-4f26-8f94-b5e92c5797b9";

  try {
    const res = await fetch("https://api.liteapi.travel/v3.0/hotels/rates", {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
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
    if (!data.data?.length) return [];

    const hotelIds: string[] = data.data.map((h: { hotelId: string }) => h.hotelId);
    const details = await fetchHotelDetails(apiKey, hotelIds);

    return data.data
      .map((h: {
        hotelId: string;
        roomTypes?: {
          offerRetailRate?: { amount?: number; currency?: string };
          rates?: { retailRate?: { total?: { amount?: number; currency?: string }[] } }[];
        }[];
      }) => {
        const detail = details.get(h.hotelId);
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
          locationName: detail?.address || detail?.city || "",
          coords: { lat: detail?.latitude || Number(lat), lng: detail?.longitude || Number(lng) },
          stars: detail?.starRating,
          photo: detail?.main_photo,
          pricePerNight: price ? Math.round(price / getDaysDiff(checkin, checkout)) : undefined,
          currency,
          rating: detail?.rating,
          type: "hotel",
          source: "liteapi" as const,
        };
      })
      .filter((h: HotelResult) => h.name !== h.id.replace("lite-", "") && h.pricePerNight != null);
  } catch {
    return [];
  }
}

async function fetchHotelDetails(
  apiKey: string,
  hotelIds: string[]
): Promise<
  Map<
    string,
    {
      name: string;
      address: string;
      city: string;
      latitude: number;
      longitude: number;
      starRating: number;
      main_photo: string;
      rating: number;
    }
  >
> {
  const map = new Map();
  const chunks = [];
  for (let i = 0; i < hotelIds.length; i += 5) {
    chunks.push(hotelIds.slice(i, i + 5));
  }
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (id) => {
        try {
          const res = await fetch(`https://api.liteapi.travel/v3.0/data/hotel?hotelId=${id}`, {
            headers: { "X-API-Key": apiKey },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return { id, detail: data.data };
        } catch {
          return null;
        }
      })
    );
    for (const r of results) {
      if (r?.detail) map.set(r.id, r.detail);
    }
  }
  return map;
}

function getDaysDiff(checkin: string, checkout: string): number {
  const d1 = new Date(checkin);
  const d2 = new Date(checkout);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radiusKm = request.nextUrl.searchParams.get("radius") || "10";
  const checkin = request.nextUrl.searchParams.get("checkin");
  const checkout = request.nextUrl.searchParams.get("checkout");

  if (!lat || !lng) {
    return Response.json({ error: "lat and lng required" }, { status: 400 });
  }
  if (!checkin || !checkout) {
    return Response.json({ error: "checkin and checkout required" }, { status: 400 });
  }

  const hotels = await searchLiteAPI(lat, lng, radiusKm, checkin, checkout);
  hotels.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));

  return Response.json(hotels);
}
