import Dexie, { type Table } from "dexie";
import type { ActivityWire } from "@/domain/sync";
import type { ActivityDraft, MemberDraft } from "@/domain/types";

export type OutboxStatus = "pending" | "failed" | "conflict";
export type MemberOutboxStatus = "pending" | "failed";

export interface LocalOutbox {
  id?: number;
  entityId: string;
  op: "save" | "remove";
  baseVersion: number | null;
  queuedAt: string;
  status: OutboxStatus;
  error: string | null;
  payload: ActivityDraft;
  serverVersion: number | null;
  serverActivity: ActivityWire | null;
}

/** Create-only queue — a new member row has no server counterpart to conflict with. */
export interface MemberOutbox {
  id?: number;
  clientId: string;
  churchId: string;
  queuedAt: string;
  status: MemberOutboxStatus;
  error: string | null;
  payload: MemberDraft;
}

/**
 * Versioned Dexie schema. Add the next version with an upgrade that copies rows.
 * Do not clear `outbox` or `activities` in an upgrade. A service-worker update
 * must keep an unsent edit. The named check is Ptr. Jo Lunas installing a new
 * version while an edit is still on the phone.
 */
export class WestDatabase extends Dexie {
  activities!: Table<ActivityWire, string>;
  outbox!: Table<LocalOutbox, number>;
  meta!: Table<{ key: string; value: string }, string>;
  memberOutbox!: Table<MemberOutbox, number>;

  constructor() {
    super("west-mis");
    this.version(1).stores({
      activities: "id, updatedAt, startAt",
      outbox: "++id, entityId, status, queuedAt",
      meta: "key",
    });
    this.version(2).stores({
      activities: "id, updatedAt, startAt",
      outbox: "++id, entityId, status, queuedAt",
      meta: "key",
      memberOutbox: "++id, churchId, status, queuedAt",
    });
  }
}

let database: WestDatabase | null = null;

export function localDb(): WestDatabase {
  if (!database) database = new WestDatabase();
  return database;
}

export async function deleteLocalDb(): Promise<void> {
  const current = database ?? new WestDatabase();
  database = null;
  await current.delete();
}
