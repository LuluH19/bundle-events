import type { LatLng } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export interface GeocodingResult {
  displayName: string;
  address: string;
  coords: LatLng;
  type: string;
}

export async function searchLocation(
  query: string
): Promise<GeocodingResult[]> {
  if (!query.trim() || !MAPBOX_TOKEN) return [];

  const params = new URLSearchParams({
    q: query,
    access_token: MAPBOX_TOKEN,
    language: "fr",
    country: "FR",
    limit: "5",
    types: "address,place,street,locality",
  });

  const url = `https://api.mapbox.com/search/geocode/v6/forward?${params}`;
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
  if (!MAPBOX_TOKEN) return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

  const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${coords.lng}&latitude=${coords.lat}&access_token=${MAPBOX_TOKEN}&language=fr&limit=1`;
  const res = await fetch(url);

  if (!res.ok) return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

  const data = await res.json();
  const feature = data.features?.[0];
  return feature?.properties?.full_address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}
