import posthog from "posthog-js";

const projectToken = process.env.POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.POSTHOG_HOST;

if (!projectToken || !apiHost) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = projectToken
      ? "POSTHOG_HOST"
      : "POSTHOG_PROJECT_TOKEN";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-05-30",
    capture_pageview: "history_change",
    capture_exceptions: true,
  });
}
