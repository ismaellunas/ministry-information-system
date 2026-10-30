import { resolveActivityBounds } from "@/domain/activity-bounds";
import {
  isOutboxExpired,
  mutationsToPush,
  provisionalOverlapNotes,
  wireToActivity,
  type ActivityWire,
  type PushStatus,
  type QueuedMutation,
  type SyncCursor,
} from "@/domain/sync";
import type { ActivityDraft, ActivityLike } from "@/domain/types";
import { deleteLocalDb, localDb, type LocalOutbox } from "@/lib/local-db";

const listeners = new Set<() => void>();

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const listener of Array.from(listeners)) listener();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("west-mis-sync"));
}

export async function unsentCount(): Promise<number> {
  return localDb().outbox.where("status").anyOf("pending", "conflict").count();
}

export async function readSyncMeta(): Promise<{ lastSync: string | null; unsent: number; failed: number }> {
  const db = localDb();
  const [last, unsent, failed] = await Promise.all([
    db.meta.get("lastSync"),
    db.outbox.where("status").anyOf("pending", "conflict").count(),
    db.outbox.where("status").equals("failed").count(),
  ]);
  return { lastSync: last?.value ?? null, unsent, failed };
}

export async function listStoredActivities(): Promise<ActivityWire[]> {
  return localDb().activities.toArray();
}

export async function pendingEntityIds(): Promise<string[]> {
  const rows = await localDb().outbox.where("status").anyOf("pending", "conflict").toArray();
  return rows.map((row) => row.entityId);
}

export async function listOutboxProblems(): Promise<LocalOutbox[]> {
  return localDb().outbox.where("status").anyOf("failed", "conflict").toArray();
}

export async function clearLocalDatabase(): Promise<void> {
  await deleteLocalDb();
  emit();
}

export async function previewLocalSave(draft: ActivityDraft): Promise<string[]> {
  const bounds = resolveActivityBounds(draft);
  const draftLike: ActivityLike = {
    id: draft.id ?? "preview",
    scope: draft.scope,
    visibility: draft.visibility ?? (draft.scope === "LOCAL" ? "PUBLIC" : null),
    churchId: draft.scope === "LOCAL" ? draft.churchId ?? null : null,
    ministryId: draft.scope === "SECTIONAL" ? draft.ministryId ?? null : null,
    hostChurchId: draft.scope === "SECTIONAL" ? draft.hostChurchId ?? null : null,
    atOwnChurch: draft.scope === "LOCAL" ? draft.atOwnChurch !== false : null,
    startAt: bounds.start,
    endAt: bounds.end,
    deleted: false,
  };
  const stored = await localDb().activities.filter((row) => !row.deleted).toArray();
  const others = stored
    .filter((row) => row.id !== draft.id)
    .map((row) => ({ ...wireToActivity(row), title: row.title }));
  return provisionalOverlapNotes(draftLike, others);
}

export async function queueEventSave(draft: ActivityDraft, baseVersion: number | null): Promise<void> {
  const id = draft.id ?? crypto.randomUUID();
  const payload: ActivityDraft = { ...draft, id };
  const bounds = resolveActivityBounds(payload);
  const db = localDb();
  const now = new Date().toISOString();
  const existing = await db.activities.get(id);
  const row: ActivityWire = {
    id,
    title: payload.title.trim(),
    description: blank(payload.description),
    location: blank(payload.location),
    startAt: bounds.start.toISOString(),
    endAt: bounds.end.toISOString(),
    isAllDay: payload.isAllDay,
    scope: payload.scope,
    visibility: payload.scope === "LOCAL" ? payload.visibility ?? "PUBLIC" : null,
    churchId: payload.scope === "LOCAL" ? payload.churchId ?? null : null,
    ministryId: payload.scope === "SECTIONAL" ? payload.ministryId ?? null : null,
    hostChurchId: payload.scope === "SECTIONAL" ? payload.hostChurchId ?? null : null,
    atOwnChurch: payload.scope === "LOCAL" ? payload.atOwnChurch !== false : null,
    audience: payload.audience ?? null,
    createdBy: existing?.createdBy ?? "",
    deleted: false,
    version: existing?.version ?? baseVersion ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.activities.put(row);
  const pending = await db.outbox
    .where("entityId")
    .equals(id)
    .and((item) => item.status === "pending" && item.op === "save")
    .first();
  if (pending?.id != null) {
    await db.outbox.update(pending.id, { payload });
  } else {
    await db.outbox.add({
      entityId: id,
      op: "save",
      baseVersion,
      queuedAt: now,
      status: "pending",
      error: null,
      payload,
      serverVersion: null,
      serverActivity: null,
    });
  }
  emit();
  void registerBackgroundSync();
}

export async function queueEventRemove(id: string, baseVersion: number): Promise<void> {
  const db = localDb();
  const now = new Date().toISOString();
  const existing = await db.activities.get(id);
  if (existing) await db.activities.put({ ...existing, deleted: true, updatedAt: now });
  const pendingCreate = await db.outbox
    .where("entityId")
    .equals(id)
    .and((item) => item.status === "pending" && item.op === "save" && item.baseVersion == null)
    .first();
  if (pendingCreate?.id != null) {
    await db.outbox.delete(pendingCreate.id);
    emit();
    return;
  }
  await db.outbox.add({
    entityId: id,
    op: "remove",
    baseVersion,
    queuedAt: now,
    status: "pending",
    error: null,
    payload: {
      id,
      title: existing?.title ?? "Removed event",
      isAllDay: existing?.isAllDay ?? false,
      startAt: existing?.startAt ?? now,
      endAt: existing?.endAt ?? now,
      scope: existing?.scope ?? "LOCAL",
      actingRole: "CHURCH_REP",
    },
    serverVersion: null,
    serverActivity: null,
  });
  emit();
  void registerBackgroundSync();
}

export async function rememberSeen(
  items: Array<Pick<ActivityWire, "id" | "title" | "startAt" | "endAt" | "isAllDay" | "scope" | "ministryId" | "churchId" | "location">>
): Promise<void> {
  const db = localDb();
  const pending = new Set(await pendingEntityIds());
  await db.transaction("rw", db.activities, async () => {
    for (const item of items) {
      if (pending.has(item.id)) continue;
      const existing = await db.activities.get(item.id);
      if (existing) continue;
      const now = new Date().toISOString();
      await db.activities.put({
        id: item.id,
        title: item.title,
        description: null,
        location: item.location,
        startAt: item.startAt,
        endAt: item.endAt,
        isAllDay: item.isAllDay,
        scope: item.scope,
        visibility: null,
        churchId: item.churchId,
        ministryId: item.ministryId,
        hostChurchId: null,
        atOwnChurch: null,
        audience: null,
        createdBy: "",
        deleted: false,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

export async function readLocalDraft(id: string): Promise<{ wire: ActivityWire; baseVersion: number | null; payload: ActivityDraft | null } | null> {
  const db = localDb();
  const wire = await db.activities.get(id);
  if (!wire || wire.deleted) return null;
  const rows = await db.outbox.where("entityId").equals(id).sortBy("queuedAt");
  const pending = rows.filter((row) => row.status === "pending" || row.status === "conflict").at(-1) ?? null;
  const baseVersion = pending ? pending.baseVersion : wire.version > 0 ? wire.version : null;
  return { wire, baseVersion, payload: pending?.payload ?? null };
}

export async function keepMine(outboxId: number): Promise<void> {
  const row = await localDb().outbox.get(outboxId);
  if (!row?.id || row.serverVersion == null) return;
  await localDb().outbox.update(row.id, { status: "pending", baseVersion: row.serverVersion, error: null });
  emit();
  await runSync();
}

export async function keepServer(outboxId: number): Promise<void> {
  const db = localDb();
  const row = await db.outbox.get(outboxId);
  if (!row?.id) return;
  if (row.serverActivity) await db.activities.put(row.serverActivity);
  await db.outbox.delete(row.id);
  emit();
}

export async function runSync(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    const expired = await failExpired();
    await pushPending();
    if (expired) await refreshFromScratch();
    else await pullAll();
    await localDb().meta.put({ key: "lastSync", value: new Date().toISOString() });
    emit();
  } catch (error) {
    if (error instanceof SyncAuthError) {
      await clearLocalDatabase();
      if (typeof window !== "undefined") {
        window.location.assign(error.deactivated ? "/login?reason=deactivated" : "/login");
      }
      return;
    }
    emit();
  }
}

async function failExpired(): Promise<boolean> {
  const db = localDb();
  const now = new Date();
  const rows = await db.outbox.where("status").anyOf("pending", "conflict").toArray();
  let expired = false;
  for (const row of rows) {
    if (!row.id || !isOutboxExpired(row.queuedAt, now)) continue;
    expired = true;
    await db.outbox.update(row.id, {
      status: "failed",
      error: "This change was queued longer than 30 days.",
    });
  }
  return expired;
}

async function refreshFromScratch(): Promise<void> {
  const db = localDb();
  const pendingIds = new Set((await db.outbox.where("status").anyOf("pending", "conflict").toArray()).map((row) => row.entityId));
  const kept: ActivityWire[] = [];
  for (const id of Array.from(pendingIds)) {
    const row = await db.activities.get(id);
    if (row) kept.push(row);
  }
  await db.activities.clear();
  await db.meta.delete("cursor");
  await pullAll();
  for (const row of kept) await db.activities.put(row);
}

async function pushPending(): Promise<void> {
  const db = localDb();
  const pending = await db.outbox.where("status").equals("pending").sortBy("queuedAt");
  const mutations = mutationsToPush(pending.filter((row) => row.id != null).map(toMutation));
  for (let index = 0; index < mutations.length; index += 20) {
    const batch = mutations.slice(index, index + 20);
    const response = await fetch("/api/sync/push", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: batch }),
    });
    await assertAuthed(response);
    if (!response.ok) return;
    const body = (await response.json()) as {
      results?: Array<{ clientId: number | null; status: PushStatus; error: string | null; activity: ActivityWire | null }>;
    };
    for (const result of body.results ?? []) {
      if (result.clientId == null) continue;
      const row = await db.outbox.get(result.clientId);
      if (!row?.id) continue;
      if (result.status === "ok") {
        if (result.activity) await db.activities.put(result.activity);
        else if (row.op === "remove") {
          const existing = await db.activities.get(row.entityId);
          if (existing) await db.activities.put({ ...existing, deleted: true });
        }
        await db.outbox.delete(row.id);
      } else if (result.status === "conflict") {
        await db.outbox.update(row.id, {
          status: "conflict",
          error: result.error,
          serverVersion: result.activity?.version ?? null,
          serverActivity: result.activity,
        });
      } else if (result.status === "failed" || result.status === "expired") {
        await db.outbox.update(row.id, { status: "failed", error: result.error });
      }
    }
  }
}

async function pullAll(): Promise<void> {
  const db = localDb();
  let cursor = await readCursor();
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams();
    if (cursor) {
      params.set("since", cursor.updatedAt);
      params.set("sinceId", cursor.id);
    }
    const response = await fetch(`/api/sync/pull?${params.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    await assertAuthed(response);
    if (!response.ok) return;
    const body = (await response.json()) as {
      activities?: ActivityWire[];
      cursor?: SyncCursor | null;
      more?: boolean;
    };
    const pending = new Set(await pendingEntityIds());
    for (const activity of body.activities ?? []) {
      if (pending.has(activity.id)) continue;
      await db.activities.put(activity);
    }
    const next = body.cursor ?? null;
    if (next) await db.meta.put({ key: "cursor", value: JSON.stringify(next) });
    const advanced = next != null && (cursor == null || next.updatedAt !== cursor.updatedAt || next.id !== cursor.id);
    cursor = next;
    if (!body.more || !advanced) break;
  }
}

function toMutation(row: LocalOutbox): QueuedMutation {
  return {
    clientId: row.id ?? null,
    entityId: row.entityId,
    op: row.op,
    baseVersion: row.baseVersion,
    queuedAt: row.queuedAt,
    payload: row.payload,
  };
}

async function readCursor(): Promise<SyncCursor | null> {
  const row = await localDb().meta.get("cursor");
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as SyncCursor;
    if (!parsed.updatedAt || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

class SyncAuthError extends Error {
  constructor(readonly deactivated: boolean) {
    super(deactivated ? "deactivated" : "signed-out");
  }
}

async function assertAuthed(response: Response): Promise<void> {
  if (response.status !== 401) return;
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new SyncAuthError(body?.error === "deactivated");
}

export async function registerBackgroundSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sync = (registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    if (!sync) return;
    await sync.register("west-mis-sync");
  } catch {
    // Background Sync is Chromium-only. The open-app timer still runs.
  }
}

function blank(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
