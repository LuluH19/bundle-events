import type * as maplibregl from "maplibre-gl";
import { mapboxConfig, mapConfig } from "@/src/config";

export type MapLib = typeof maplibregl;

export interface MapEngine {
  name: "maplibre" | "mapbox";
  lib: MapLib;
  style: string;
}

let enginePromise: Promise<MapEngine> | null = null;

async function styleReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(mapConfig.styleCheckTimeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

async function maplibreEngine(): Promise<MapEngine> {
  const lib = await import("maplibre-gl");
  return { name: "maplibre", lib, style: mapConfig.openFreeMapStyleUrl };
}

async function mapboxEngine(): Promise<MapEngine> {
  const mapbox = (await import("mapbox-gl")).default;
  mapbox.accessToken = mapboxConfig.token;
  return { name: "mapbox", lib: mapbox as unknown as MapLib, style: mapboxConfig.styleUrl };
}

function mapboxStyleApiUrl(): string {
  const path = mapboxConfig.styleUrl.replace("mapbox://styles/", "");
  return `https://api.mapbox.com/styles/v1/${path}?access_token=${encodeURIComponent(mapboxConfig.token)}`;
}

async function resolveEngine(): Promise<MapEngine> {
  if (mapboxConfig.token && (await styleReachable(mapboxStyleApiUrl()))) return mapboxEngine();
  return maplibreEngine();
}

export function loadMapEngine(): Promise<MapEngine> {
  enginePromise ??= resolveEngine().catch((err) => {
    enginePromise = null;
    throw err;
  });
  return enginePromise;
}
