import { describe, expect, it } from "vitest";
import { formatTicketmasterDate, mapTicketmasterEvents } from "@/src/adapters/events/ticketmaster.adapter";
import { mapAddressFeature } from "@/src/adapters/geocoding/geoplateforme.adapter";

describe("Ticketmaster", () => {
  it("formate la date de l'événement en français", () => {
    expect(formatTicketmasterDate("2026-12-12", "20:00:00")).toBe("Samedi 12 décembre, 20h00");
    expect(formatTicketmasterDate("2026-12-12")).toBe("Samedi 12 décembre");
    expect(formatTicketmasterDate(undefined)).toBeUndefined();
  });

  it("transforme un événement en lieu et ignore ceux sans coordonnées", () => {
    const venues = mapTicketmasterEvents([
      {
        id: "1",
        name: "Concert",
        dates: { start: { localDate: "2026-12-12", localTime: "20:00:00" } },
        _embedded: {
          venues: [
            {
              name: "Arkéa Arena",
              address: { line1: "48-50 avenue Jean Alfonséa" },
              postalCode: "33270",
              city: { name: "Floirac" },
              location: { latitude: "44.8379", longitude: "-0.5264" },
            },
          ],
        },
      },
      { id: "2", name: "Sans salle" },
    ]);
    expect(venues).toEqual([
      {
        id: "tm-1",
        name: "Concert",
        address: "Arkéa Arena, 48-50 avenue Jean Alfonséa, 33270 Floirac",
        coords: { lat: 44.8379, lng: -0.5264 },
        city: "Floirac",
        dateLabel: "Samedi 12 décembre, 20h00",
      },
    ]);
  });
});

describe("API Adresse (Géoplateforme)", () => {
  it("met la rue en titre et la ville en sous-titre", () => {
    const r = mapAddressFeature({
      geometry: { coordinates: [-1.68545, 48.100032] },
      properties: { label: "Rue de la Paix 35000 Rennes", name: "Rue de la Paix", city: "Rennes", postcode: "35000", context: "35, Ille-et-Vilaine, Bretagne", type: "street" },
    });
    expect(r).toEqual({
      displayName: "Rue de la Paix, 35000 Rennes",
      address: "35000 Rennes, 35, Ille-et-Vilaine, Bretagne",
      coords: { lat: 48.100032, lng: -1.68545 },
      type: "street",
    });
  });

  it("affiche une commune avec son code postal", () => {
    const r = mapAddressFeature({
      geometry: { coordinates: [-1.68, 48.11] },
      properties: { label: "Rennes", name: "Rennes", city: "Rennes", postcode: "35000", context: "35, Ille-et-Vilaine, Bretagne", type: "municipality" },
    });
    expect(r.displayName).toBe("Rennes, 35000");
    expect(r.address).toBe("35, Ille-et-Vilaine, Bretagne");
  });
});

describe("isShortEvent", () => {
  it("écarte les activités permanentes étalées sur des années", async () => {
    const { isShortEvent } = await import("@/src/adapters/events/opendata.adapter");
    expect(isShortEvent("2021-06-20T08:00:00+00:00", "2027-12-30T18:00:00+00:00")).toBe(false);
    expect(isShortEvent("2026-12-09T18:00:00+00:00", "2026-12-13T23:00:00+00:00")).toBe(true);
    expect(isShortEvent(null, null)).toBe(true);
  });
});
