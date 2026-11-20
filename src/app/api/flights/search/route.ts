import { NextRequest } from "next/server";
import { apiCacheConfig, travelpayoutsConfig } from "@/src/config";
import { cached } from "@/src/lib/api-cache";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.searchParams.get("origin");
  const destination = request.nextUrl.searchParams.get("destination");
  const departureAt = request.nextUrl.searchParams.get("departure_at");

  if (!origin || !destination) {
    return Response.json({ error: "origin and destination IATA codes required" }, { status: 400 });
  }

  const token = travelpayoutsConfig.apiKey;
  if (!token) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    origin,
    destination,
    token,
    currency: "EUR",
    sorting: "price",
    limit: "5",
  });

  if (departureAt) {
    params.set("departure_at", departureAt);
  }

  // The token stays out of the cache key.
  try {
    const { data: flights, status } = await cached({
      provider: "travelpayouts",
      key: `prices:${origin}:${destination}:${departureAt || "any"}`,
      ...apiCacheConfig.policies.flights,
      fetcher: () => fetchFlights(params),
    });
    return Response.json({ flights }, { headers: { "X-Cache": status } });
  } catch {
    return Response.json({ flights: [], degraded: true }, { status: 503 });
  }
}

async function fetchFlights(params: URLSearchParams) {
  const res = await fetch(
    `${travelpayoutsConfig.baseUrl}/prices_for_dates?${params}`
  );

  if (!res.ok) {
    throw new Error(`Travelpayouts error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.success || !data.data?.length) {
    return [];
  }

  return data.data.map(
    (f: {
      origin: string;
      destination: string;
      price: number;
      departure_at: string;
      return_at?: string;
      airline: string;
      flight_number: string;
      transfers: number;
      duration: number;
      duration_to: number;
    }) => ({
      origin: f.origin,
      destination: f.destination,
      price: f.price,
      airline: f.airline,
      flightNumber: f.flight_number,
      departureAt: f.departure_at,
      transfers: f.transfers,
      durationMinutes: f.duration_to || f.duration,
    })
  );
}
