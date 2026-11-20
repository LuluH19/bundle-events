import { describe, expect, it } from "vitest";
import { readRateConditions } from "@/src/adapters/hotels/liteapi.adapter";
import { hotelConditions, transportConditions } from "@/src/utils/fare-conditions";
import type { RouteOption, RouteSegment, TransportMode } from "@/src/types";

describe("readRateConditions", () => {
  it("lit un tarif remboursable avec la première échéance payante", () => {
    expect(
      readRateConditions({
        boardType: "BI",
        cancellationPolicies: {
          refundableTag: "RFN",
          cancelPolicyInfos: [
            { cancelTime: "2026-12-11 12:00:00", amount: 120 },
            { cancelTime: "2026-12-09 12:00:00", amount: 60 },
            { cancelTime: "2026-12-01 12:00:00", amount: 0 },
          ],
        },
      })
    ).toEqual({ refundable: true, freeCancellationUntil: "2026-12-09T12:00:00.000Z", board: "BI" });
  });

  it("lit un tarif non remboursable sans échéance", () => {
    expect(
      readRateConditions({
        boardType: "RO",
        cancellationPolicies: { refundableTag: "NRFN", cancelPolicyInfos: [{ cancelTime: "2026-12-01 00:00:00", amount: 90 }] },
      })
    ).toEqual({ refundable: false, board: "RO" });
  });

  it("ne renvoie rien quand LiteAPI ne précise pas les conditions", () => {
    expect(readRateConditions(undefined)).toEqual({});
    expect(readRateConditions({ boardType: "BB2" })).toEqual({ board: "BB" });
  });
});

describe("hotelConditions", () => {
  const now = new Date("2026-11-16T10:00:00Z");

  it("affiche la date limite d'annulation gratuite à l'heure de Paris", () => {
    expect(hotelConditions({ refundable: true, freeCancellationUntil: "2026-12-09T12:00:00.000Z", board: "BI" }, now)).toEqual({
      cancellation: { label: "Annulation gratuite jusqu'au 9 déc. à 13h00", free: true },
      board: "Petit-déjeuner inclus",
    });
  });

  it("signale un tarif non remboursable ou une échéance dépassée", () => {
    expect(hotelConditions({ refundable: false }, now).cancellation).toEqual({ label: "Non remboursable", free: false });
    expect(hotelConditions({ refundable: true, freeCancellationUntil: "2026-11-01T12:00:00.000Z" }, now).cancellation).toEqual({
      label: "Annulation payante",
      free: false,
    });
  });

  it("n'invente rien sans information (hôtel sans tarif ou formule inconnue)", () => {
    expect(hotelConditions({ board: "XX" }, now)).toEqual({});
  });
});

describe("transportConditions", () => {
  const seg = (mode: TransportMode): RouteSegment => ({
    from: { name: "A", coords: { lat: 0, lng: 0 } },
    to: { name: "B", coords: { lat: 1, lng: 1 } },
    mode,
    coordinates: [],
    distanceKm: 10,
    durationMinutes: 10,
  });
  const option = (modes: TransportMode[]) =>
    ({ route: { segments: modes.map(seg) } }) as unknown as RouteOption;

  it("donne la page de conditions de chaque transporteur du trajet", () => {
    expect(transportConditions(option(["walking", "train", "bus"])).map((c) => c.carrier)).toEqual(["SNCF", "FlixBus"]);
    expect(transportConditions(option(["car"]))).toEqual([]);
  });
});
