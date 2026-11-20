const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Bundle ids are Postgres uuids: anything else can never match a row. */
export function isUuid(value: string | undefined | null): value is string {
  return !!value && UUID_RE.test(value);
}
