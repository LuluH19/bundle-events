import { LatLng } from "@/src/types";
import { haversineDistance } from "./algorithms/geodesic";

export function findNearest<T extends { coords: LatLng; id: string }>(point: LatLng, items: T[]): T {
  return items.reduce((best, item) =>
    haversineDistance(point, item.coords) < haversineDistance(point, best.coords) ? item : best
  );
}
