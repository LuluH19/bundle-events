import { test, expect, type Page } from "@playwright/test";

// Test end-to-end : parcours reel dans un navigateur.
// L'utilisateur choisit un depart (geocodage Mapbox), un evenement (Mapbox Search
// Box), des dates, puis lance la recherche -> il atterrit sur l'ecran Ton voyage
// avec un hotel choisi parmi /api/hotels/search. Toutes les frontieres externes sont
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

  await page.route("**/search/searchbox/v1/forward**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        features: [
          {
            geometry: { coordinates: [2.3786, 48.8388] },
            properties: {
              mapbox_id: "accor-arena",
              name: "Accor Arena",
              full_address: "8 Bd de Bercy, 75012 Paris",
              context: { place: { name: "Paris" } },
            },
          },
        ],
      }),
    })
  );
  await page.route("**/opendata.iledefrance.fr/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [] }) })
  );
  await page.route("**/nominatim.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );

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

function dayLabel(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

async function pickDay(page: Page, daysFromNow: number) {
  const name = new RegExp(`^${dayLabel(daysFromNow)}(,|$)`);
  for (let i = 0; i < 3; i++) {
    const day = page.getByRole("button", { name });
    if (await day.count()) {
      await day.first().click();
      return;
    }
    await page.getByRole("button", { name: "Mois suivant" }).click();
  }
  throw new Error(`Jour introuvable : ${dayLabel(daysFromNow)}`);
}

test.describe("Parcours de recherche d'un voyage", () => {
  test.beforeEach(async ({ page }) => {
    await stubNetwork(page);
  });

  test("le CTA reste desactive tant que depart, evenement et dates ne sont pas choisis", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator("#search-card").getByRole("button", { name: /Voir mon voyage/i });
    await expect(cta).toBeDisabled();
  });

  test("depart + evenement + dates -> atterrit sur Ton voyage avec un hotel choisi", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("Adresse, gare ou ville").fill("Lyon");
    const depOption = page.getByRole("option", { name: /Lyon/i });
    await expect(depOption.first()).toBeVisible();
    await depOption.first().click();

    await page.getByPlaceholder("Salle, stade, festival…").fill("Accor");
    const venueOption = page.getByRole("option", { name: /Accor Arena/i });
    await expect(venueOption.first()).toBeVisible();
    await venueOption.first().click();

    await page.getByRole("button", { name: /Quand \?/ }).click();
    await pickDay(page, 30);
    await pickDay(page, 32);
    await page.getByRole("button", { name: "Valider les dates" }).click();

    const cta = page.locator("#search-card").getByRole("button", { name: /Voir mon voyage/i });
    await expect(cta).toBeEnabled();
    await cta.click();

    await page.waitForURL(new RegExp(`/${BUNDLE_UUID}/voyage$`), { timeout: 30000 });

    await expect(page.getByRole("heading", { name: /Lyon → Accor Arena/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Hotel Bercy Test")).toBeVisible({ timeout: 15000 });
  });

  test("les anciennes URL redirigent vers les nouveaux ecrans", async ({ page }) => {
    await page.goto(`/${BUNDLE_UUID}/hotels`);
    await expect(page).toHaveURL(new RegExp(`/${BUNDLE_UUID}/voyage$`));
    await page.goto(`/${BUNDLE_UUID}/bundle`);
    await expect(page).toHaveURL(new RegExp(`/${BUNDLE_UUID}/reserver$`));
  });
});
