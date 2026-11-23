import { describe, expect, it } from "vitest";
import type { Venue } from "@/src/types";
import { addressVenue, mergeVenueSuggestions } from "@/src/utils/venue-suggestions";
import { venueProvider } from "@/src/utils/analytics";

const rivoli = addressVenue({
  displayName: "12 Rue de Rivoli, 75004 Paris",
  address: "12 Rue de Rivoli 75004 Paris",
  coords: { lat: 48.85512, lng: 2.35791 },
  type: "housenumber",
});

const event = (id: string, name: string, lat = 48.8, lng = 2.3): Venue => ({ id, name, address: "", coords: { lat, lng }, city: "Paris" });

describe("addressVenue", () => {
  it("transforme une adresse en lieu sélectionnable", () => {
    expect(rivoli).toEqual({
      id: "addr-48.85512,2.35791",
      name: "12 Rue de Rivoli",
      address: "12 Rue de Rivoli 75004 Paris",
      coords: { lat: 48.85512, lng: 2.35791 },
      city: "",
    });
    expect(venueProvider(rivoli.id)).toBe("address");
  });
});

describe("mergeVenueSuggestions", () => {
  it("place les événements avant les adresses", () => {
    const merged = mergeVenueSuggestions([event("oa-1", "Concert à la Cigale")], [rivoli]);
    expect(merged.map((v) => v.id)).toEqual(["oa-1", rivoli.id]);
  });

  it("retire une adresse qui désigne le même endroit qu'un événement", () => {
    const sameSpot = event("poi-1", "12 Rue de Rivoli", 48.85512, 2.35791);
    expect(mergeVenueSuggestions([sameSpot], [rivoli]).map((v) => v.id)).toEqual(["poi-1"]);
  });

  it("limite le nombre de suggestions", () => {
    const events = Array.from({ length: 10 }, (_, i) => event(`oa-${i}`, `Événement ${i}`, 48 + i, 2));
    expect(mergeVenueSuggestions(events, [rivoli], 8)).toHaveLength(8);
  });
});
