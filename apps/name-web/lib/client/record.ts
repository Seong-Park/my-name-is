import { isRecord, type StoredRecord } from "../contracts";
export const RECORD_KEY = "name-web:last-result:v1";
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type LockPort = {
  request: (name: string, fn: () => unknown) => Promise<unknown>;
};
export function readRecord(
  storage: StoragePort,
  key: string,
): {
  status: "empty" | "ready" | "corrupt" | "unavailable";
  raw: string | null;
  record: StoredRecord | null;
} {
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
    if (raw === null) return { status: "empty", raw, record: null };
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && "deleted" in value && value.deleted === true &&
        "revision" in value && typeof value.revision === "string" && Object.keys(value).length === 2)
      return { status: "empty", raw, record: null };
    return isRecord(value)
      ? { status: "ready", raw, record: value }
      : { status: "corrupt", raw, record: null };
  } catch {
    return {
      status: raw === null ? "unavailable" : "corrupt",
      raw,
      record: null,
    };
  }
}
export async function writeRecord(
  storage: StoragePort,
  locks: LockPort | undefined,
  key: string,
  expectedRaw: string | null,
  record: StoredRecord | null,
  isCurrent = () => true,
): Promise<{ status: "saved"; raw: string } | "changed" | "failed" | "unavailable"> {
  if (!locks) return "unavailable";
  try {
    return (await locks.request(key, () => {
      if (!isCurrent() || storage.getItem(key) !== expectedRaw)
        return "changed";
      // A non-personal deletion revision also invalidates an initially empty tab.
      const raw = JSON.stringify(record ?? { deleted: true, revision: crypto.randomUUID() });
      storage.setItem(key, raw);
      return { status: "saved", raw };
    })) as { status: "saved"; raw: string } | "changed";
  } catch {
    return "failed";
  }
}
