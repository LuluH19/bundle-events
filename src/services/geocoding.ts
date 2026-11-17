import type { LatLng, GeocodingResult } from "@/src/types";
import { mapboxConfig, nominatimConfig } from "@/src/config";
import { reverseAddress, searchAddresses } from "@/src/adapters/geocoding/geoplateforme.adapter";
import { firstNonEmpty, firstSuccess } from "@/src/utils/fallback";

interface MapboxFeature {
  properties: {
    full_address?: string;
    name?: string;
    place_formatted?: string;
    feature_type?: string;
  };
  geometry: { coordinates: [number, number] };
}

interface NominatimPlace {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  addresstype?: string;
}

async function searchMapbox(query: string): Promise<GeocodingResult[]> {
  if (!mapboxConfig.token) return [];
  const params = new URLSearchParams({
    q: query,
    access_token: mapboxConfig.token,
    language: mapboxConfig.defaultLanguage,
    country: "FR",
    limit: "5",
    types: "address,place,street,locality",
  });
  const res = await fetch(`${mapboxConfig.baseUrl}/forward?${params}`);
  if (!res.ok) throw new Error(`Mapbox Geocoding error: ${res.status}`);
  const data: { features?: MapboxFeature[] } = await res.json();
  return (data.features ?? []).map((f) => ({
    displayName: f.properties.full_address || f.properties.name || "",
    address: f.properties.full_address || f.properties.place_formatted || "",
    coords: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
    type: f.properties.feature_type || "",
  }));
}

async function searchNominatim(query: string): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: nominatimConfig.countryCodes,
    "accept-language": "fr",
    limit: "5",
  });
  const res = await fetch(`${nominatimConfig.baseUrl}/search?${params}`);
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
  const data: NominatimPlace[] = await res.json();
  return data.map((p) => ({
    displayName: p.display_name,
    address: p.display_name,
    coords: { lat: parseFloat(p.lat), lng: parseFloat(p.lon) },
    type: p.addresstype ?? "",
  }));
}

export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];
  const { value } = await firstNonEmpty([
    { name: "geoplateforme", run: () => searchAddresses(query) },
    { name: "mapbox", run: () => searchMapbox(query) },
    { name: "nominatim", run: () => searchNominatim(query) },
  ]);
  return value;
}

async function reverseMapbox(coords: LatLng): Promise<string> {
  if (!mapboxConfig.token) throw new Error("Mapbox token missing");
  const params = new URLSearchParams({
    longitude: String(coords.lng),
    latitude: String(coords.lat),
    access_token: mapboxConfig.token,
    language: mapboxConfig.defaultLanguage,
    limit: "1",
  });
  const res = await fetch(`${mapboxConfig.baseUrl}/reverse?${params}`);
  if (!res.ok) throw new Error(`Mapbox reverse error: ${res.status}`);
  const data: { features?: MapboxFeature[] } = await res.json();
  const label = data.features?.[0]?.properties?.full_address;
  if (!label) throw new Error("Mapbox reverse: no result");
  return label;
}

export async function reverseGeocode(coords: LatLng): Promise<string> {
  const fallback = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  try {
    const { value } = await firstSuccess([
      {
        name: "geoplateforme",
        run: async () => {
          const label = await reverseAddress(coords);
          if (!label) throw new Error("Géoplateforme reverse: no result");
          return label;
        },
      },
      { name: "mapbox", run: () => reverseMapbox(coords) },
    ]);
    return value;
  } catch {
    return fallback;
  }
}
