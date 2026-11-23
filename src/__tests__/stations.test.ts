import { describe, expect, it } from "vitest";
import { isMainStation, pickStationPair, rankStations } from "@/src/utils/algorithms/stations";

const st = (id: string, uic: string, lat: number, lng: number) => ({ id, sncfId: `stop_area:SNCF:${uic}`, coords: { lat, lng } });

const venueLyon = { lat: 45.7605, lng: 4.827 };
const saintPaul = st("saint-paul", "87721159", 45.7661, 4.8273);
const perrache = st("perrache", "87722025", 45.7487, 4.8259);
const partDieu = st("part-dieu", "87723197", 45.7606, 4.8594);
const villefranche = st("far-main", "87721001", 45.98, 4.72);

describe("isMainStation", () => {
  it("reconnaît une grande gare par son code UIC", () => {
    expect(isMainStation(perrache)).toBe(true);
    expect(isMainStation(saintPaul)).toBe(false);
  });
});

describe("rankStations", () => {
  it("préfère une grande gare proche à la petite gare la plus proche", () => {
    expect(rankStations(venueLyon, [saintPaul, partDieu, perrache])[0].id).toBe("perrache");
  });

  it("garde la gare la plus proche si aucune grande gare n'est à moins de 4 km de plus", () => {
    const local = st("local", "87000001", 45.9, 4.7);
    expect(rankStations({ lat: 45.9, lng: 4.7 }, [local, perrache])[0].id).toBe("local");
  });
});

describe("pickStationPair", () => {
  it("évite de partir et d'arriver à la même gare", () => {
    const pair = pickStationPair(venueLyon, venueLyon, [perrache, saintPaul], [perrache, saintPaul]);
    expect(pair?.[0].id).not.toBe(pair?.[1].id);
  });

  it("renvoie null sans gare", () => {
    expect(pickStationPair(venueLyon, venueLyon, [], [villefranche])).toBeNull();
  });
});
