import posthog from "posthog-js";

const projectToken = process.env.POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.POSTHOG_HOST;

if (!projectToken || !apiHost) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = projectToken
      ? "POSTHOG_HOST"
      : "POSTHOG_PROJECT_TOKEN";

    console.warn(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This warning stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(projectToken, {
    // Same-origin proxy declared in next.config.ts, so ad blockers do not drop events.
    api_host: "/ingest",
    ui_host: apiHost.replace(".i.posthog.com", ".posthog.com"),
    defaults: "2026-05-30",
    capture_pageview: "history_change",
    capture_exceptions: true,
    capture_heatmaps: true,
    capture_dead_clicks: true,
    capture_performance: { web_vitals: true, network_timing: true },
  });
}
