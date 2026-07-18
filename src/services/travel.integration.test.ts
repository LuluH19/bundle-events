import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LatLng } from "@/src/types";
import { computeOptions } from "@/src/services/travel";
import { computeRoute, isShortHaulFlightBanned } from "@/src/utils/algorithms/routing";
import { priceEstimate } from "@/src/utils/travel";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";
import { airports } from "@/src/utils/constants/airports";

// Test d'integration : on branche ensemble les vrais modules
// (services/travel -> routing -> geodesic -> utils/travel -> config)
// et on ne mocke QUE la frontiere HTTP externe (fetch : OSRM, SNCF, OpenRailRouting).

const PARIS: { name: string; coords: LatLng } = {
  name: "Paris",
  coords: { lat: 48.8566, lng: 2.3522 },
};
const MARSEILLE: { name: string; coords: LatLng } = {
  name: "Marseille",
  coords: { lat: 43.2965, lng: 5.3698 },
};
const BORDEAUX: { name: string; coords: LatLng } = {
  name: "Bordeaux",
  coords: { lat: 44.8378, lng: -0.5792 },
};

function jsonResponse(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data } as Response;
}

// Deux paires de coords "lng,lat" dans une URL OSRM/point
function parseCoordPairs(url: string): LatLng[] {
  const pairs: LatLng[] = [];

  // OSRM : /{profile}/{lng},{lat};{lng},{lat}?...
  const osrm = url.match(/\/([\-\d.]+),([\-\d.]+);([\-\d.]+),([\-\d.]+)/);
  if (osrm) {
    pairs.push({ lng: +osrm[1], lat: +osrm[2] });
    pairs.push({ lng: +osrm[3], lat: +osrm[4] });
    return pairs;
  }

  // OpenRailRouting : ?point={lat},{lng}&point={lat},{lng}
  const points = [...url.matchAll(/point=([\-\d.]+),([\-\d.]+)/g)];
  for (const p of points) pairs.push({ lat: +p[1], lng: +p[2] });
  return pairs;
}

// Fausse implementation reseau, deterministe, basee sur des distances reelles
function fakeFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input);

  // --- OSRM (voiture / pieton / bus) ---
  if (url.includes("router.project-osrm.org")) {
    const [a, b] = parseCoordPairs(url);
    const km = haversineDistance(a, b) * 1.25; // facteur route
    const isFoot = url.includes("/foot/");
    const speedKmh = isFoot ? 5 : 60;
    return Promise.resolve(
      jsonResponse({
        code: "Ok",
        routes: [
          {
            distance: km * 1000,
            duration: (km / speedKmh) * 3600,
            geometry: {
              coordinates: [
                [a.lng, a.lat],
                [b.lng, b.lat],
              ],
            },
          },
        ],
      })
    );
  }

  // --- API interne stations (proche d'un point) ---
  if (url.includes("/api/stations")) {
    const params = new URL(url, "http://localhost").searchParams;
    const lat = parseFloat(params.get("lat") || "0");
    const lng = parseFloat(params.get("lng") || "0");
    const tag = `${lat.toFixed(1)}_${lng.toFixed(1)}`;
    return Promise.resolve(
      jsonResponse({
        stations: [
          { id: `st-${tag}-a`, name: `Gare ${tag} A`, sncfId: `sncf-${tag}-a`, coords: { lat: lat + 0.01, lng: lng + 0.01 } },
          { id: `st-${tag}-b`, name: `Gare ${tag} B`, sncfId: `sncf-${tag}-b`, coords: { lat: lat + 0.02, lng: lng + 0.02 } },
        ],
      })
    );
  }

  // --- Geometrie train SNCF : indisponible -> force le fallback OpenRailRouting ---
  if (url.includes("/api/trains/route-geometry")) {
    return Promise.resolve(jsonResponse({}, false, 404));
  }

  if (url.includes("/api/trains/search")) {
    const params = new URL(url, "http://localhost").searchParams;
    const parse = (id: string | null) => {
      const m = (id || "").match(/sncf-([\-\d.]+)_([\-\d.]+)-/);
      return m ? { lat: +m[1], lng: +m[2] } : null;
    };
    const a = parse(params.get("from"));
    const b = parse(params.get("to"));
    if (!a || !b) return Promise.resolve(jsonResponse({ journeys: [] }));
    const km = haversineDistance(a, b);
    const durationMinutes = (km / 250) * 60 + 20;
    const dep = new Date("2026-08-14T08:00:00");
    const arr = new Date(dep.getTime() + durationMinutes * 60000);
    const iso = (d: Date) => d.toISOString().slice(0, 19);
    return Promise.resolve(
      jsonResponse({
        journeys: [{ trains: [{ type: "TGV INOUI", departureTime: iso(dep), arrivalTime: iso(arr) }] }],
      })
    );
  }

  // --- OpenRailRouting (fallback rail) ---
  if (url.includes("routing.openrailrouting.org")) {
    const [a, b] = parseCoordPairs(url);
    const km = haversineDistance(a, b) * 1.15;
    return Promise.resolve(
      jsonResponse({
        paths: [
          {
            distance: km * 1000,
            time: (km / 120) * 3600 * 1000, // ms
            points: {
              coordinates: [
                [a.lng, a.lat],
                [b.lng, b.lat],
              ],
            },
          },
        ],
      })
    );
  }

  return Promise.resolve(jsonResponse({}, false, 404));
}

describe("integration : services/travel + routing + geodesic", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(fakeFetch));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("computeRoute(car) produit un unique segment voiture depuis OSRM", async () => {
    const route = await computeRoute(PARIS, MARSEILLE, ["car"]);

    expect(route.segments).toHaveLength(1);
    expect(route.segments[0].mode).toBe("car");
    expect(route.isMultimodal).toBe(false);
    expect(route.totalDistanceKm).toBeGreaterThan(0);
    expect(route.totalDistanceKm).toBe(route.segments[0].distanceKm);
  });

  it("computeRoute(plane) choisit les aeroports les plus proches et integre le grand-cercle geodesique", async () => {
    const route = await computeRoute(PARIS, MARSEILLE, ["plane"]);

    // acces -> vol -> acces
    expect(route.segments).toHaveLength(3);
    const flight = route.segments[1];
    expect(flight.mode).toBe("plane");
    expect(route.isMultimodal).toBe(true);

    // les aeroports retenus doivent etre les plus proches des constantes
    const nearest = (p: LatLng) =>
      [...airports].sort(
        (x, y) => haversineDistance(p, x.coords) - haversineDistance(p, y.coords)
      )[0];
    const dep = nearest(PARIS.coords);
    const arr = nearest(MARSEILLE.coords);

    // le segment vol est calcule par haversine entre ces deux aeroports
    const expectedKm = haversineDistance(dep.coords, arr.coords);
    expect(flight.distanceKm).toBeCloseTo(expectedKm, 6);
    expect(flight.from.name).toBe(dep.name);
    expect(flight.to.name).toBe(arr.name);
  });

  it("computeRoute(train) tombe sur le fallback OpenRailRouting et reste multimodal", async () => {
    const route = await computeRoute(PARIS, MARSEILLE, ["train"]);

    expect(route.segments.length).toBeGreaterThanOrEqual(3);
    expect(route.segments.some((s) => s.mode === "train")).toBe(true);
    expect(route.totalDurationMinutes).toBeGreaterThan(0);
  });

  it("computeOptions selectionne les modes selon la distance et calcule des prix coherents", async () => {
    const options = await computeOptions(PARIS, MARSEILLE);

    // Paris-Marseille (~660 km) : marche exclue (>8), train (>20) et avion (>200) inclus
    const modes = options.map((o) => o.mode);
    expect(modes).not.toContain("walking");
    expect(modes).toContain("car");
    expect(modes).toContain("train");
    expect(modes).toContain("plane");

    // triees par duree croissante
    const durations = options.map((o) => o.durationMin);
    expect([...durations].sort((a, b) => a - b)).toEqual(durations);

    // le prix de chaque option provient bien de priceEstimate(mode, distance)
    for (const opt of options) {
      expect(opt.price).toBe(priceEstimate(opt.mode, opt.distanceKm));
      expect(opt.distanceKm).toBe(opt.route.totalDistanceKm);
      expect(opt.durationMin).toBe(opt.route.totalDurationMinutes);
    }
  });

  it("interdiction vols courts : Paris-Bordeaux (TGV direct < 2h30) retire l'avion du bundle", async () => {
    const options = await computeOptions(PARIS, BORDEAUX);
    const modes = options.map((o) => o.mode);
    expect(modes).not.toContain("plane");
    expect(modes).toContain("train");
    expect(modes).toContain("car");
  });

  it("isShortHaulFlightBanned : vrai pour Paris-Bordeaux (<2h30), faux pour Paris-Marseille (>2h30)", async () => {
    expect(await isShortHaulFlightBanned(PARIS, BORDEAUX)).toBe(true);
    expect(await isShortHaulFlightBanned(PARIS, MARSEILLE)).toBe(false);
  });

  it("computeRoute(plane) sur une route interdite bascule automatiquement sur le train", async () => {
    const route = await computeRoute(PARIS, BORDEAUX, ["plane"]);
    expect(route.segments.some((s) => s.mode === "plane")).toBe(false);
    expect(route.segments.some((s) => s.mode === "train")).toBe(true);
  });

  it("computeOptions sur une courte distance propose la marche et exclut l'avion", async () => {
    const from = { name: "Louvre", coords: { lat: 48.8606, lng: 2.3376 } };
    const to = { name: "Notre-Dame", coords: { lat: 48.853, lng: 2.3499 } }; // ~1.5 km

    const options = await computeOptions(from, to);
    const modes = options.map((o) => o.mode);

    expect(modes).toContain("walking");
    expect(modes).not.toContain("plane");
    expect(modes).not.toContain("train");
    const walking = options.find((o) => o.mode === "walking");
    expect(walking?.price).toBe(0); // priceEstimate("walking") === 0
  });
});
