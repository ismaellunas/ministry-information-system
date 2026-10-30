import { churchRepChurchIds } from "./activity-access";
import { classify } from "./conflict";
import type { Activity, ActivityDraft, ActivityLike, AudienceLabel, Profile } from "./types";
import { allDayBounds, formatManila } from "./time";

export const OUTBOX_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const PULL_PAGE_SIZE = 500;

export interface SyncCursor {
  updatedAt: string;
  id: string;
}

export type PushStatus = "ok" | "failed" | "conflict" | "expired" | "retry";

export interface QueuedMutation {
  clientId?: number | null;
  entityId: string;
  op: "save" | "remove";
  baseVersion: number | null;
  queuedAt: string;
  payload: ActivityDraft;
}

export interface PushOutcome {
  clientId: number | null;
  entityId: string;
  status: PushStatus;
  error: string | null;
  activity: Activity | null;
}

/** JSON shape stored on the phone and returned by pull. */
export interface ActivityWire {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  scope: Activity["scope"];
  visibility: Activity["visibility"];
  churchId: string | null;
  ministryId: number | null;
  hostChurchId: string | null;
  atOwnChurch: boolean | null;
  audience: AudienceLabel | null;
  createdBy: string;
  deleted: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function activityToWire(activity: Activity): ActivityWire {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    location: activity.location,
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt.toISOString(),
    isAllDay: activity.isAllDay,
    scope: activity.scope,
    visibility: activity.visibility,
    churchId: activity.churchId,
    ministryId: activity.ministryId,
    hostChurchId: activity.hostChurchId,
    atOwnChurch: activity.atOwnChurch,
    audience: activity.audience,
    createdBy: activity.createdBy,
    deleted: activity.deleted,
    version: activity.version,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}

export function wireToActivity(wire: ActivityWire): Activity {
  return {
    ...wire,
    startAt: new Date(wire.startAt),
    endAt: new Date(wire.endAt),
    createdAt: new Date(wire.createdAt),
    updatedAt: new Date(wire.updatedAt),
  };
}

export function isAfterCursor(row: { updatedAt: string; id: string }, cursor: SyncCursor): boolean {
  const rowMs = Date.parse(row.updatedAt);
  const cursorMs = Date.parse(cursor.updatedAt);
  if (Number.isNaN(rowMs) || Number.isNaN(cursorMs)) {
    return row.updatedAt > cursor.updatedAt || (row.updatedAt === cursor.updatedAt && row.id > cursor.id);
  }
  if (rowMs > cursorMs) return true;
  if (rowMs < cursorMs) return false;
  return row.id > cursor.id;
}

export function advanceCursor(
  rows: Array<{ updatedAt: string; id: string }>,
  current: SyncCursor | null
): SyncCursor | null {
  let best = current;
  for (const row of rows) {
    if (!best || isAfterCursor(row, best)) best = { updatedAt: row.updatedAt, id: row.id };
  }
  return best;
}

/** One second of overlap so two rows with the same timestamp are not skipped. */
export function overlapSince(cursor: SyncCursor): string {
  return new Date(Date.parse(cursor.updatedAt) - 1000).toISOString();
}

export function isOutboxExpired(queuedAt: string, now: Date): boolean {
  const queued = Date.parse(queuedAt);
  if (Number.isNaN(queued)) return true;
  return now.getTime() - queued > OUTBOX_TTL_MS;
}

/** Previous Manila month through the next 12 months, end exclusive. */
export function firstPullWindow(now: Date): { start: Date; end: Date } {
  const civil = formatManila(now, "yyyy-MM-dd");
  const year = Number(civil.slice(0, 4));
  const month = Number(civil.slice(5, 7));
  const startIndex = month - 2;
  const startYear = year + Math.floor(startIndex / 12);
  const startMonth = ((startIndex % 12) + 12) % 12;
  const startCivil = `${startYear}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const endIndex = month - 1 + 13;
  const endYear = year + Math.floor(endIndex / 12);
  const endMonth = ((endIndex % 12) + 12) % 12;
  const endCivil = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-01`;
  return { start: allDayBounds(startCivil).start, end: allDayBounds(endCivil).start };
}

/** Church-only rows stay with that church's representatives. Tombstones follow the same rule. */
export function visibleInPull(viewer: Profile, activity: ActivityLike): boolean {
  if (activity.scope === "SECTIONAL") return true;
  if (activity.visibility === "PUBLIC") return true;
  if (activity.visibility !== "CHURCH_ONLY" || !activity.churchId) return false;
  return churchRepChurchIds(viewer).includes(activity.churchId);
}

/**
 * One save per unacknowledged chain. A later edit of the same create replaces the payload
 * and keeps the original queue time so the 30-day clock does not reset.
 */
export function mutationsToPush(rows: QueuedMutation[]): QueuedMutation[] {
  const grouped = new Map<string, QueuedMutation[]>();
  for (const row of rows) {
    const list = grouped.get(row.entityId) ?? [];
    list.push(row);
    grouped.set(row.entityId, list);
  }
  const collapsed: QueuedMutation[] = [];
  for (const list of Array.from(grouped.values())) {
    let index = 0;
    while (index < list.length) {
      const current = list[index];
      if (current.op !== "save") {
        collapsed.push(current);
        index += 1;
        continue;
      }
      let last = current;
      let next = index + 1;
      while (next < list.length && list[next].op === "save" && list[next].baseVersion === current.baseVersion) {
        last = { ...list[next], queuedAt: current.queuedAt, baseVersion: current.baseVersion };
        next += 1;
      }
      collapsed.push(last);
      index = next;
    }
  }
  return collapsed.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt) || a.entityId.localeCompare(b.entityId));
}

export function provisionalOverlapNotes(
  draft: ActivityLike,
  others: Array<ActivityLike & { title?: string }>
): string[] {
  const notes: string[] = [];
  for (const other of others) {
    if (classify(draft, other) !== "CONFLICT") continue;
    notes.push(`Overlaps ${other.title?.trim() || "another event"}.`);
  }
  if (notes.length === 0) return notes;
  notes.push("Other churches' private events are not on this phone, so this warning can change after sync.");
  return notes;
}
