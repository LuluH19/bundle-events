import type { LatLng, GeocodingResult } from "@/src/types";
import { mapboxConfig } from "@/src/config";

export async function searchLocation(
  query: string
): Promise<GeocodingResult[]> {
  if (!query.trim() || !mapboxConfig.token) return [];

  const params = new URLSearchParams({
    q: query,
    access_token: mapboxConfig.token,
    language: mapboxConfig.defaultLanguage,
    country: "FR",
    limit: "5",
    types: "address,place,street,locality",
  });

  const url = `${mapboxConfig.baseUrl}/forward?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Mapbox Geocoding error: ${res.status}`);
  }

  const data = await res.json();

  return (data.features || []).map(
    (f: {
      properties: {
        full_address?: string;
        name?: string;
        name_preferred?: string;
        place_formatted?: string;
        feature_type?: string;
      };
      geometry: { coordinates: [number, number] };
    }) => ({
      displayName: f.properties.full_address || f.properties.name || "",
      address: f.properties.full_address || f.properties.place_formatted || "",
      coords: {
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      },
      type: f.properties.feature_type || "",
    })
  );
}

export async function reverseGeocode(coords: LatLng): Promise<string> {
  if (!mapboxConfig.token) return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

  const url = `${mapboxConfig.baseUrl}/reverse?longitude=${coords.lng}&latitude=${coords.lat}&access_token=${mapboxConfig.token}&language=${mapboxConfig.defaultLanguage}&limit=1`;
  const res = await fetch(url);

  if (!res.ok) return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

  const data = await res.json();
  const feature = data.features?.[0];
  return feature?.properties?.full_address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}
