import { describe, it, expect } from "vitest";
import type { LatLng } from "@/src/types";
import { haversineDistance } from "@/src/utils/algorithms/geodesic";

const EARTH_RADIUS_KM = 6371;

// Points de reference reels
const PARIS: LatLng = { lat: 48.8566, lng: 2.3522 };
const LONDON: LatLng = { lat: 51.5074, lng: -0.1278 };
const NEW_YORK: LatLng = { lat: 40.7128, lng: -74.006 };

describe("haversineDistance", () => {
  it("renvoie 0 pour deux points identiques", () => {
    expect(haversineDistance(PARIS, PARIS)).toBe(0);
  });

  it("est symetrique : d(a,b) === d(b,a)", () => {
    expect(haversineDistance(PARIS, LONDON)).toBeCloseTo(
      haversineDistance(LONDON, PARIS),
      10
    );
  });

  it("ne renvoie jamais de distance negative", () => {
    expect(haversineDistance(PARIS, NEW_YORK)).toBeGreaterThan(0);
    expect(haversineDistance(NEW_YORK, PARIS)).toBeGreaterThan(0);
  });

  it("calcule ~344 km entre Paris et Londres", () => {
    // distance grand-cercle connue ~343.5 km
    expect(haversineDistance(PARIS, LONDON)).toBeGreaterThan(342);
    expect(haversineDistance(PARIS, LONDON)).toBeLessThan(345);
  });

  it("calcule ~5837 km entre Paris et New York", () => {
    // tolerance de ~5 km sur une distance transatlantique
    expect(haversineDistance(PARIS, NEW_YORK)).toBeGreaterThan(5830);
    expect(haversineDistance(PARIS, NEW_YORK)).toBeLessThan(5845);
  });

  it("vaut R * (pi/180) pour 1 degre de latitude le long d'un meridien", () => {
    const expected = (EARTH_RADIUS_KM * Math.PI) / 180; // ~111.19 km
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeCloseTo(expected, 6);
  });

  it("vaut R * (pi/180) pour 1 degre de longitude a l'equateur", () => {
    const expected = (EARTH_RADIUS_KM * Math.PI) / 180; // ~111.19 km
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(d).toBeCloseTo(expected, 6);
  });

  it("rapproche la distance longitudinale quand la latitude augmente", () => {
    // 1 degre de longitude couvre moins de distance pres des poles
    const atEquator = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    const atMidLat = haversineDistance({ lat: 60, lng: 0 }, { lat: 60, lng: 1 });
    expect(atMidLat).toBeLessThan(atEquator);
    // a 60 deg, ~cos(60) = 0.5 => environ la moitie
    expect(atMidLat).toBeCloseTo(atEquator * Math.cos((60 * Math.PI) / 180), 1);
  });

  it("calcule la demi-circonference terrestre entre deux antipodes", () => {
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(d).toBeCloseTo(EARTH_RADIUS_KM * Math.PI, 3); // ~20015 km
  });

  it("gere le passage de l'antimeridien (longitudes de signes opposes)", () => {
    const west: LatLng = { lat: 0, lng: 179 };
    const east: LatLng = { lat: 0, lng: -179 };
    const d = haversineDistance(west, east);
    // 2 degres d'ecart reel malgre le saut de signe de 358 deg
    expect(d).toBeCloseTo((2 * EARTH_RADIUS_KM * Math.PI) / 180, 3);
  });

  it("gere les points polaires", () => {
    const northPole: LatLng = { lat: 90, lng: 0 };
    const southPole: LatLng = { lat: -90, lng: 0 };
    expect(haversineDistance(northPole, southPole)).toBeCloseTo(
      EARTH_RADIUS_KM * Math.PI,
      3
    );
  });

  it("respecte l'inegalite triangulaire", () => {
    const direct = haversineDistance(PARIS, NEW_YORK);
    const viaLondon =
      haversineDistance(PARIS, LONDON) + haversineDistance(LONDON, NEW_YORK);
    expect(direct).toBeLessThanOrEqual(viaLondon);
  });
});
