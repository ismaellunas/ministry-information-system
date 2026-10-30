import { AppError } from "./errors";

const FORBIDDEN_KEYS = new Set([
  "fullname",
  "firstname",
  "lastname",
  "phone",
  "phonenumber",
  "pastorphone",
  "hotline",
  "hotlinenumber",
  "birthday",
  "birthmonth",
  "birthyear",
]);

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

/** Audit detail may not store member names, phones, or birthdays (blueprint §3 / §9). */
export function sanitizeAuditDetail(
  detail: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (detail === null) return null;
  for (const key of Object.keys(detail)) {
    if (FORBIDDEN_KEYS.has(normalizeKey(key))) {
      throw new AppError("AUDIT", `Audit detail cannot include ${key}.`);
    }
  }
  return detail;
}
