import type { LatLng } from "@/src/types";

export const GEOLOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 };

export function getCurrentCoords(geo: Geolocation | undefined = typeof navigator !== "undefined" ? navigator.geolocation : undefined): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!geo) {
      reject(new Error("Geolocation unsupported"));
      return;
    }
    geo.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      GEOLOCATION_OPTIONS
    );
  });
}

export async function isGeolocationGranted(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return false;
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state === "granted";
  } catch {
    return false;
  }
}
