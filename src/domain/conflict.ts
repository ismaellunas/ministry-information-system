// Pure conflict classification — zero framework imports.
// classify() decides IF a pair conflicts.
// Visibility and redaction are handled by ConflictService.
import type { ActivityLike } from "./types";

export function overlaps(a: ActivityLike, b: ActivityLike): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

export function sameLocation(local: ActivityLike, sectional: ActivityLike): boolean {
  return (
    sectional.scope === "SECTIONAL" &&
    local.scope === "LOCAL" &&
    local.atOwnChurch === true &&
    sectional.hostChurchId != null &&
    sectional.hostChurchId === local.churchId
  );
}

/**
 * Classify a pair. Returns 'CONFLICT' or 'NONE'.
 * See §8.1 conflict matrix in the blueprint.
 */
export function classify(a: ActivityLike, b: ActivityLike): "CONFLICT" | "NONE" {
  if (a.id === b.id || !overlaps(a, b) || a.deleted || b.deleted) return "NONE";

  // Normalise: x = LOCAL side (if any), y = the other
  const [x, y] = a.scope === "LOCAL" ? [a, b] : [b, a];

  // LOCAL vs LOCAL — only same-church conflicts
  if (x.scope === "LOCAL" && y.scope === "LOCAL") {
    return x.churchId === y.churchId ? "CONFLICT" : "NONE";
  }

  // SECTIONAL vs SECTIONAL — always conflicts
  if (x.scope === "SECTIONAL" && y.scope === "SECTIONAL") return "CONFLICT";

  // LOCAL (x) vs SECTIONAL (y)
  if (x.visibility === "PUBLIC" && y.ministryId != null) return "CONFLICT";
  if (sameLocation(x, y)) return "CONFLICT";

  return "NONE";
}
