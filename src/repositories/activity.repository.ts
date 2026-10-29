import type { Activity, ActivityDraft, Viewer } from "@/domain/types";

export interface ActivityRepository {
  findById(id: string): Promise<Activity | null>;
  listVisible(viewer: Viewer, range: { start: Date; end: Date }): Promise<Activity[]>;
  upsert(
    a: ActivityDraft & { id: string; createdBy: string },
    expectedVersion?: number
  ): Promise<Activity>;
  softDelete(id: string, expectedVersion: number): Promise<void>;
  /** Service-role only — sees church-only rows for conflict detection. */
  listOverlapping(range: { start: Date; end: Date }): Promise<Activity[]>;
}
