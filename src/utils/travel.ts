import { LatLng, TransportMode } from "@/src/types";
import { haversineDistance } from "./algorithms/geodesic";

export function priceEstimate(mode: TransportMode, km: number): number {
  switch (mode) {
    case "walking":
      return 0;
    case "bus":
      return Math.round(km * 0.06 + 5);
    case "car":
      return Math.round(km * 0.13 + 6);
    case "train":
      return Math.round(km * 0.16 + 15);
    case "plane":
      return Math.round(km * 0.1 + 55);
  }
}

export function findNearest<T extends { coords: LatLng; id: string }>(point: LatLng, items: T[]): T {
  return items.reduce((best, item) =>
    haversineDistance(point, item.coords) < haversineDistance(point, best.coords) ? item : best
  );
}
