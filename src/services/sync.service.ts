import { AppError } from "@/domain/errors";
import {
  PULL_PAGE_SIZE,
  advanceCursor,
  firstPullWindow,
  isAfterCursor,
  isOutboxExpired,
  overlapSince,
  visibleInPull,
  type PushOutcome,
  type QueuedMutation,
  type SyncCursor,
} from "@/domain/sync";
import type { Profile } from "@/domain/types";
import type { ActivityRepository } from "@/repositories/activity.repository";
import type { ActivityService } from "./activity.service";

export class SyncService {
  constructor(
    private readonly actor: Profile,
    private readonly activities: ActivityRepository,
    private readonly events: Pick<ActivityService, "save" | "remove">,
    private readonly now: () => Date = () => new Date()
  ) {}

  async pull(cursor: SyncCursor | null) {
    const window = cursor ? null : firstPullWindow(this.now());
    const rows = await this.activities.listForPull({
      updatedSince: cursor ? overlapSince(cursor) : null,
      start: window?.start ?? null,
      end: window?.end ?? null,
    });
    const visible = rows.filter((row) => visibleInPull(this.actor, row));
    const fresh = cursor
      ? visible.filter((row) => isAfterCursor({ updatedAt: row.updatedAt.toISOString(), id: row.id }, cursor))
      : visible;
    const next = advanceCursor(
      visible.map((row) => ({ updatedAt: row.updatedAt.toISOString(), id: row.id })),
      cursor
    );
    return {
      activities: visible,
      cursor: next,
      more: fresh.length > 0 && rows.length >= PULL_PAGE_SIZE,
    };
  }

  async push(mutations: QueuedMutation[]): Promise<PushOutcome[]> {
    const byEntity = new Map<string, QueuedMutation[]>();
    for (const mutation of mutations) {
      const list = byEntity.get(mutation.entityId) ?? [];
      list.push(mutation);
      byEntity.set(mutation.entityId, list);
    }
    const results: PushOutcome[] = [];
    for (const list of Array.from(byEntity.values())) {
      let stopped: PushOutcome["status"] | null = null;
      for (const mutation of list) {
        if (stopped) {
          results.push({
            clientId: mutation.clientId ?? null,
            entityId: mutation.entityId,
            status: stopped === "retry" ? "retry" : "failed",
            error: "An earlier change for this event has to be resolved first.",
            activity: null,
          });
          continue;
        }
        const outcome = await this.apply(mutation);
        if (outcome.status !== "ok") stopped = outcome.status;
        results.push(outcome);
      }
    }
    return results;
  }

  private async apply(mutation: QueuedMutation): Promise<PushOutcome> {
    const base = {
      clientId: mutation.clientId ?? null,
      entityId: mutation.entityId,
      activity: null,
    };
    if (isOutboxExpired(mutation.queuedAt, this.now())) {
      return { ...base, status: "expired", error: "This change was queued longer than 30 days." };
    }
    try {
      if (mutation.op === "remove") {
        if (mutation.baseVersion == null) {
          return { ...base, status: "failed", error: "This removal has no version to check." };
        }
        await this.events.remove(mutation.entityId, mutation.baseVersion);
        const activity = await this.activities.findById(mutation.entityId);
        return { ...base, status: "ok", error: null, activity };
      }
      const saved = await this.events.save({
        ...mutation.payload,
        id: mutation.entityId,
        expectedVersion: mutation.baseVersion ?? undefined,
      });
      return { ...base, status: "ok", error: null, activity: saved };
    } catch (error) {
      if (error instanceof AppError && error.code === "VERSION") {
        const activity = await this.activities.findById(mutation.entityId);
        return { ...base, status: "conflict", error: error.message, activity };
      }
      if (
        error instanceof AppError &&
        (error.code === "VALIDATION" || error.code === "FORBIDDEN" || error.code === "NOT_FOUND")
      ) {
        return { ...base, status: "failed", error: error.message };
      }
      return { ...base, status: "retry", error: "Could not sync. Will try again." };
    }
  }
}
