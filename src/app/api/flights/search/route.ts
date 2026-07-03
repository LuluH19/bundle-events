import { NextRequest } from "next/server";
import { travelpayoutsConfig } from "@/src/config";

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

  const res = await fetch(
    `${travelpayoutsConfig.baseUrl}/prices_for_dates?${params}`
  );

  if (!res.ok) {
    return Response.json({ error: `Travelpayouts error: ${res.status}` }, { status: res.status });
  }

  const data = await res.json();

  if (!data.success || !data.data?.length) {
    return Response.json({ flights: [] });
  }

  const flights = data.data.map(
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

  return Response.json({ flights });
}
