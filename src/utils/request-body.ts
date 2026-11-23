export type JsonBody = { ok: true; body: unknown } | { ok: false; status: 400 | 413; error: string };

/**
 * Reads a JSON request body, refusing it with 413 past `maxBytes`. The declared
 * Content-Length is checked first so an oversized upload is refused before parsing.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBody> {
  const tooLarge = { ok: false, status: 413, error: "Request body too large" } as const;
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge;

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
  if (new TextEncoder().encode(text).length > maxBytes) return tooLarge;

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" };
  }
}
