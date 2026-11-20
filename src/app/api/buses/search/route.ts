import { NextRequest } from "next/server";
import type { BusNetwork } from "@/src/types";
import data from "@/src/utils/constants/bus-network.json";
import { findBusConnection } from "@/src/utils/algorithms/bus-connection";

const network = data as unknown as BusNetwork;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const from = { lat: Number(sp.get("fromLat")), lng: Number(sp.get("fromLng")) };
  const to = { lat: Number(sp.get("toLat")), lng: Number(sp.get("toLng")) };
  if (![from.lat, from.lng, to.lat, to.lng].every(Number.isFinite)) {
    return Response.json({ error: "fromLat, fromLng, toLat and toLng required" }, { status: 400 });
  }
  const connection = findBusConnection(network, from, to, sp.get("date") ?? undefined);
  return Response.json({ connection, validTo: network.validTo });
}
