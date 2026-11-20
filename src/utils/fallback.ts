export interface ProviderStep<T> {
  name: string;
  run: () => Promise<T>;
}

export interface FallbackResult<T> {
  source: string | null;
  value: T;
}

export async function firstNonEmpty<T>(steps: ProviderStep<T[]>[]): Promise<FallbackResult<T[]>> {
  for (const step of steps) {
    try {
      const value = await step.run();
      if (value.length > 0) return { source: step.name, value };
    } catch {
      continue;
    }
  }
  return { source: null, value: [] };
}

export async function firstSuccess<T>(steps: ProviderStep<T>[]): Promise<FallbackResult<T>> {
  let lastError: unknown = new Error("No provider available");
  for (const step of steps) {
    try {
      return { source: step.name, value: await step.run() };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function firstNonEmptyParallel<T>(steps: ProviderStep<T[]>[]): Promise<FallbackResult<T[]>> {
  const running = steps.map((step) => step.run());
  running.forEach((p) => p.catch(() => undefined));
  for (let i = 0; i < steps.length; i++) {
    try {
      const value = await running[i];
      if (value.length > 0) return { source: steps[i].name, value };
    } catch {
      continue;
    }
  }
  return { source: null, value: [] };
}

export function withBudget<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}
