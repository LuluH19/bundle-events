export interface StoreHealthConfig {
  errorRetryMs: number;
  timeoutThreshold: number;
  timeoutRetryMs: number;
}

export type StoreFailure = { kind: "timeout" | "error"; disabledForMs: number; log: boolean };

export function isTimeoutError(err: unknown): boolean {
  if (!err) return false;
  const name = typeof err === "object" && "name" in err ? String((err as { name?: unknown }).name) : "";
  const message = typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : String(err);
  return name === "TimeoutError" || name === "AbortError" || /timeout|timed out|aborted/i.test(message);
}

export function createStoreHealth(config: StoreHealthConfig) {
  let disabledUntil = 0;
  let timeouts = 0;

  return {
    available(now: number): boolean {
      return now >= disabledUntil;
    },
    succeeded() {
      timeouts = 0;
    },
    failed(err: unknown, now: number): StoreFailure {
      const wasAvailable = now >= disabledUntil;
      if (isTimeoutError(err)) {
        timeouts += 1;
        if (timeouts < config.timeoutThreshold) return { kind: "timeout", disabledForMs: 0, log: false };
        timeouts = 0;
        disabledUntil = now + config.timeoutRetryMs;
        return { kind: "timeout", disabledForMs: config.timeoutRetryMs, log: wasAvailable };
      }
      timeouts = 0;
      disabledUntil = now + config.errorRetryMs;
      return { kind: "error", disabledForMs: config.errorRetryMs, log: wasAvailable };
    },
    disableFor(ms: number, now: number) {
      disabledUntil = now + ms;
    },
    reset() {
      disabledUntil = 0;
      timeouts = 0;
    },
  };
}
