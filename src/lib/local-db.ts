import Dexie, { type Table } from "dexie";
import type { ActivityWire } from "@/domain/sync";
import type { ActivityDraft } from "@/domain/types";

export type OutboxStatus = "pending" | "failed" | "conflict";

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

  constructor() {
    super("west-mis");
    this.version(1).stores({
      activities: "id, updatedAt, startAt",
      outbox: "++id, entityId, status, queuedAt",
      meta: "key",
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
