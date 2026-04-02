import { NextResponse } from "next/server";

type HotelResponse = {
  id: string;
  name: string;
  stars: number;
  address: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
};

type LiteApiError = {
  error?: {
    message?: string;
    description?: string;
  };
};

type LiteHotelRaw = {
  id?: string;
  name?: string;
  stars?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  main_photo?: string;
  thumbnail?: string;
  image?: string;
  mainPhoto?: string;
};

type LiteHotelsRawResponse = {
  data?: LiteHotelRaw[];
};

const CONCERT = {
  lat: 48.8979,
  lng: 2.3920,
};

const LITEAPI_BASE_URL = "https://api.liteapi.travel/v3.0/data/hotels";

async function fetchHotels(radiusMeters: number, apiKey: string) {
  const url = new URL(LITEAPI_BASE_URL);
  url.searchParams.set("latitude", String(CONCERT.lat));
  url.searchParams.set("longitude", String(CONCERT.lng));
  // LiteAPI requires at least (countryCode OR other search criteria).
  // We pin the country so the query works reliably.
  url.searchParams.set("countryCode", "FR");
  url.searchParams.set("radius", String(radiusMeters));
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-API-Key": apiKey },
    cache: "no-store",
  });

  const json: unknown = await res
    .json()
    .catch(() => ({ error: { message: "Invalid JSON from LiteAPI" } }));

  return { ok: res.ok, status: res.status, json };
}

function normalizeHotels(liteJson: unknown): HotelResponse[] {
  const lite = liteJson as LiteHotelsRawResponse;
  const maybeData = lite?.data;
  if (!Array.isArray(maybeData)) return [];

  return maybeData
    .map((h) => {
      const id = h?.id;
      const lat = h?.latitude ?? h?.lat;
      const lng = h?.longitude ?? h?.lng;

      const image =
        h?.main_photo ?? h?.thumbnail ?? h?.image ?? h?.mainPhoto ?? null;

      return {
        id: String(id ?? ""),
        name: String(h?.name ?? ""),
        stars: Number(h?.stars ?? 0),
        address: String(h?.address ?? ""),
        lat: Number(lat),
        lng: Number(lng),
        imageUrl: image ? String(image) : null,
      };
    })
    .filter(
      (h) =>
        h.id.length > 0 &&
        Number.isFinite(h.lat) &&
        Number.isFinite(h.lng) &&
        Number.isFinite(h.stars),
    );
}

export async function GET() {
  const apiKey = process.env.LITEAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing server env var: LITEAPI_KEY" },
      { status: 500 },
    );
  }

  // The spec says `radius=2`, but LiteAPI documents radius in meters
  // with a minimum of 1000m. We retry with 2000m if 2 is rejected.
  const requestedRadius = 2;
  const fallbackRadius = 2000;

  const firstTry = await fetchHotels(requestedRadius, apiKey);
  if (firstTry.ok) return NextResponse.json(normalizeHotels(firstTry.json));

  const msg = String(
    [
      (firstTry.json as LiteApiError)?.error?.message ?? "",
      (firstTry.json as LiteApiError)?.error?.description ?? "",
    ]
      .filter(Boolean)
      .join(" "),
  ).toLowerCase();
  const shouldFallback =
    firstTry.status === 400 &&
    (msg.includes("radius") || msg.includes("min") || msg.includes("1000"));

  if (shouldFallback) {
    const secondTry = await fetchHotels(fallbackRadius, apiKey);
    if (secondTry.ok) return NextResponse.json(normalizeHotels(secondTry.json));
  }

  return NextResponse.json(
    { error: "LiteAPI hotels request failed", status: firstTry.status },
    { status: 500 },
  );
}

