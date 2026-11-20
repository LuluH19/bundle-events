import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentCoords, isGeolocationGranted } from "@/src/utils/geolocation";

afterEach(() => vi.unstubAllGlobals());

const geo = (impl: Geolocation["getCurrentPosition"]) => ({ getCurrentPosition: impl }) as unknown as Geolocation;

describe("getCurrentCoords", () => {
  it("renvoie la position de l'appareil", async () => {
    const g = geo((ok) => ok({ coords: { latitude: 48.85, longitude: 2.35 } } as GeolocationPosition));
    await expect(getCurrentCoords(g)).resolves.toEqual({ lat: 48.85, lng: 2.35 });
  });

  it("échoue si l'utilisateur refuse", async () => {
    const g = geo((_ok, fail) => fail?.({ code: 1, message: "denied" } as GeolocationPositionError));
    await expect(getCurrentCoords(g)).rejects.toMatchObject({ code: 1 });
  });

  it("échoue sans géolocalisation", async () => {
    await expect(getCurrentCoords(undefined)).rejects.toThrow();
  });
});

describe("isGeolocationGranted", () => {
  it("ne demande jamais la permission, il lit seulement son état", async () => {
    const query = vi.fn().mockResolvedValue({ state: "granted" });
    vi.stubGlobal("navigator", { permissions: { query } });
    await expect(isGeolocationGranted()).resolves.toBe(true);
    query.mockResolvedValue({ state: "prompt" });
    await expect(isGeolocationGranted()).resolves.toBe(false);
  });

  it("vaut false sans API Permissions", async () => {
    vi.stubGlobal("navigator", {});
    await expect(isGeolocationGranted()).resolves.toBe(false);
  });
});
