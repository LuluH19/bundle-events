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
