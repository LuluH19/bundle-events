import "server-only";

import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";

const loggerName = "posthog-bundle-events";
let loggerProvider: LoggerProvider | undefined;

export function initializePostHogLogs() {
  if (loggerProvider) return;

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

    return;
  }

  const exporter = new OTLPLogExporter({
    url: new URL("/i/v1/logs", apiHost).toString(),
    headers: { Authorization: `Bearer ${projectToken}` },
  });

  loggerProvider = new LoggerProvider({
    processors: [new SimpleLogRecordProcessor({ exporter })],
  });
  logs.setGlobalLoggerProvider(loggerProvider);
}

export function logBundleCreated() {
  logs.getLogger(loggerName).emit({
    severityNumber: SeverityNumber.INFO,
    severityText: "INFO",
    body: "Bundle saved",
    attributes: {
      "bundle.operation": "create",
      "app.component": "bundles_api",
    },
  });
}

export function logBundleLinkEmailRequested(sent: boolean) {
  logs.getLogger(loggerName).emit({
    severityNumber: SeverityNumber.INFO,
    severityText: "INFO",
    body: "Bundle link email requested",
    attributes: {
      "bundle.operation": "email_link",
      "email.delivery_succeeded": sent,
    },
  });
}

export async function flushPostHogLogs() {
  await loggerProvider?.forceFlush();
}
