import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// E2E_PROD=1 runs the suite against an existing `next build` output (`next start`)
// instead of the dev server. CI uses it to test what actually ships.
const PROD = !!process.env.E2E_PROD;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Un token factice suffit : les appels Mapbox sont interceptes dans les tests,
    // mais le token doit etre "truthy" pour que le chemin de geocodage s'execute.
    // Le token doit aussi etre present au moment du `next build` en mode PROD
    // (NEXT_PUBLIC_* est inline au build).
    command: (PROD ? "next start -p " : "next dev -p ") + PORT,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_MAPBOX_TOKEN: "e2e-test-token",
    },
  },
});
