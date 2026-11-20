import type { GeocodingResult, LatLng } from "@/src/types";
import { geoplateformeConfig } from "@/src/config";

interface AddressFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    name?: string;
    city?: string;
    postcode?: string;
    context?: string;
    type?: string;
  };
}

export function mapAddressFeature(f: AddressFeature): GeocodingResult {
  const { label, name, city, postcode, context, type } = f.properties;
  const locality = [postcode, city].filter(Boolean).join(" ");
  const isTown = type === "municipality" || !name || name === city;
  return {
    displayName: isTown ? [city ?? label, postcode].filter(Boolean).join(", ") : [name, locality].filter(Boolean).join(", "),
    address: [isTown ? "" : locality, context].filter(Boolean).join(", ") || label,
    coords: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
    type: type ?? "",
  };
}

async function get(path: string, params: Record<string, string>): Promise<AddressFeature[]> {
  const res = await fetch(`${geoplateformeConfig.baseUrl}/${path}?${new URLSearchParams(params)}`, {
    signal: AbortSignal.timeout(geoplateformeConfig.timeoutMs),
  });
  if (!res.ok) throw new Error(`Géoplateforme error: ${res.status}`);
  const data: { features?: AddressFeature[] } = await res.json();
  return data.features ?? [];
}

export async function searchAddresses(query: string): Promise<GeocodingResult[]> {
  const features = await get("search", { q: query, limit: "5", index: "address", autocomplete: "1" });
  return features.map(mapAddressFeature);
}

export async function reverseAddress(coords: LatLng): Promise<string | null> {
  const [f] = await get("reverse", { lon: String(coords.lng), lat: String(coords.lat), limit: "1", index: "address" });
  return f?.properties.label ?? null;
}
