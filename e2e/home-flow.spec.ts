import { test, expect, type Page } from "@playwright/test";

// Test end-to-end : parcours reel dans un navigateur.
// L'utilisateur choisit un depart (geocodage Mapbox), un evenement (recherche
// locale), des dates, puis lance la composition -> il atterrit sur l'etape hotels
// alimentee par /api/hotels/search. Toutes les frontieres externes sont
// interceptees pour rendre le scenario deterministe et hors-ligne.

const LYON = { lat: 45.7578, lng: 4.832 };

const BUNDLE_UUID = "11111111-1111-4111-8111-111111111111";

const SAVED_BUNDLE = {
  uuid: BUNDLE_UUID,
  data: {
    departure: { id: "dep-e2e", name: "Lyon", coords: LYON, type: "departure", address: "Lyon, France" },
    venue: {
      id: "accor-arena",
      name: "Accor Arena",
      coords: { lat: 48.8388, lng: 2.3786 },
      type: "venue",
      address: "8 Bd de Bercy, 75012 Paris",
    },
    checkin: "2026-08-16T09:00",
    checkout: "2026-08-18T09:00",
    roundTrip: true,
    outboundOption: null,
    returnOption: null,
    selectedHotel: null,
  },
};

// Style Mapbox v8 minimal mais VALIDE : sans lui, mapbox-gl plante en interne
// (".slice" sur style.layers indefini) quand on stubbe le style par un objet vide.
const EMPTY_MAPBOX_STYLE = JSON.stringify({
  version: 8,
  name: "e2e-empty",
  sources: {},
  layers: [],
});

async function stubNetwork(page: Page) {
  // 1) Telemetrie Mapbox : on coupe pour eviter les erreurs CORS bruyantes.
  await page.route("**/events.mapbox.com/**", (route) => route.abort());

  // 2) Catch-all Mapbox (tuiles/sprite/glyphs) enregistre tot => priorite basse.
  await page.route("**/api.mapbox.com/**", (route) => {
    // Le style de la carte doit etre un style v8 valide, pas un objet vide.
    if (route.request().url().includes("/styles/v1/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: EMPTY_MAPBOX_STYLE });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  // 3) Geocodage direct Mapbox (ajoute apres => priorite plus haute)
  await page.route("**/search/geocode/v6/forward**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        features: [
          {
            properties: {
              full_address: "Lyon, Auvergne-Rhone-Alpes, France",
              name: "Lyon",
              place_formatted: "Auvergne-Rhone-Alpes, France",
              feature_type: "place",
            },
            geometry: { coordinates: [LYON.lng, LYON.lat] },
          },
        ],
      }),
    })
  );

  await page.route("**/api/bundles", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ uuid: BUNDLE_UUID }),
      });
    }
    return route.continue();
  });

  await page.route("**/api/bundles/**", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SAVED_BUNDLE) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/api/hotels/search**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "hotel-e2e-1",
          name: "Hotel Bercy Test",
          locationName: "Paris 12e",
          coords: { lat: 48.8402, lng: 2.38 },
          stars: 4,
          pricePerNight: 129,
          currency: "EUR",
          source: "liteapi",
        },
        {
          id: "hotel-e2e-2",
          name: "Hotel Nation Test",
          locationName: "Paris 11e",
          coords: { lat: 48.848, lng: 2.395 },
          stars: 3,
          pricePerNight: 89,
          currency: "EUR",
          source: "overpass",
        },
      ]),
    })
  );
}

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

test.describe("Parcours de composition d'un bundle", () => {
  test.beforeEach(async ({ page }) => {
    await stubNetwork(page);
  });

  test("le CTA reste desactive tant que depart et evenement ne sont pas choisis", async ({ page }) => {
    await page.goto("/");
    const cta = page
      .locator("#search-card")
      .getByRole("button", { name: /Cr[ée]er mon bundle/i });
    await expect(cta).toBeDisabled();
  });

  test("depart + evenement + dates -> atterrit sur l'etape hotels avec des resultats", async ({ page }) => {
    await page.goto("/");

    // --- Depart : geocodage (mocke) ---
    await page.getByPlaceholder("Lieu du départ").fill("Lyon");
    const depOption = page.getByRole("button", { name: /Lyon, Auvergne/i });
    await expect(depOption).toBeVisible();
    await depOption.click();
    // le depart choisi s'affiche
    await expect(page.getByText("Lyon", { exact: true })).toBeVisible();

    // --- Evenement : recherche locale sur la constante venues ---
    await page.getByPlaceholder("Lieu de l'évènement").fill("Accor");
    const venueOption = page.getByRole("button", { name: /Accor Arena — Paris/i });
    await expect(venueOption).toBeVisible();
    await venueOption.click();

    // --- Dates ---
    const dateInputs = page.locator('input[type="datetime-local"]');
    await dateInputs.nth(0).fill(futureDate(30));
    await dateInputs.nth(1).fill(futureDate(32));

    // --- Composition ---
    const cta = page
      .locator("#search-card")
      .getByRole("button", { name: /Cr[ée]er mon bundle/i });
    await expect(cta).toBeEnabled();
    await cta.click();

    await page.waitForURL(new RegExp(`/${BUNDLE_UUID}/hotels$`), { timeout: 30000 });

    // --- Etape hotels ---
    await expect(
      page.getByRole("heading", { name: /Votre logement pr[eè]s de Accor/i })
    ).toBeVisible();
    // les hotels mockes sont rendus
    await expect(page.getByText("Hotel Bercy Test")).toBeVisible();
    await expect(page.getByText("Hotel Nation Test")).toBeVisible();
    await expect(page.getByText("€129")).toBeVisible();
  });
});
