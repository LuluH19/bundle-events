import { HotelMapItem, Location } from "@/src/types";
import { haversineDistance } from "./algorithms/geodesic";

export function getHotelDistance(h: HotelMapItem, venue: Location | null): number | null {
  if (!venue) return null;
  return haversineDistance(h.coords, venue.coords);
}

export function deduplicateHotels(liteapi: HotelMapItem[], overpass: HotelMapItem[]): HotelMapItem[] {
  const result: HotelMapItem[] = [...liteapi];
  const usedCoords = new Set(liteapi.map(h => `${h.coords.lat.toFixed(4)},${h.coords.lng.toFixed(4)}`));

  for (const osmHotel of overpass) {
    const coordKey = `${osmHotel.coords.lat.toFixed(4)},${osmHotel.coords.lng.toFixed(4)}`;
    // Skip if a LiteAPI hotel is at the same coordinates (~11m precision)
    if (usedCoords.has(coordKey)) continue;

    // Check name similarity with nearby LiteAPI hotels
    const isDuplicate = liteapi.some(lh => {
      const dist = Math.sqrt(
        Math.pow((lh.coords.lat - osmHotel.coords.lat) * 111000, 2) +
        Math.pow((lh.coords.lng - osmHotel.coords.lng) * 111000 * Math.cos(lh.coords.lat * Math.PI / 180), 2)
      );
      if (dist > 200) return false; // >200m apart = different
      // Normalize names and check similarity
      const n1 = lh.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const n2 = osmHotel.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return n1.includes(n2) || n2.includes(n1) || n1 === n2;
    });

    if (!isDuplicate) {
      result.push(osmHotel);
    }
  }

  return result;
}
