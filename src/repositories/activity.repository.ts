import type { Activity, ActivityScope, AudienceLabel, EventVisibility } from "@/domain/types";

export interface ActivityWrite {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  scope: ActivityScope;
  visibility: EventVisibility | null;
  churchId: string | null;
  ministryId: number | null;
  hostChurchId: string | null;
  atOwnChurch: boolean | null;
  audience: AudienceLabel | null;
  createdBy: string;
}

/** User JWT, or service role for an Admin public-local write. Church-only stays on the user JWT. */
export type ActivityWriteAccess = "user" | "service";

export interface ActivityRepository {
  findById(id: string): Promise<Activity | null>;
  /** Service role. Includes church-only rows the caller cannot select. */
  findManyByIds(ids: string[]): Promise<Activity[]>;
  listVisible(range: { start: Date; end: Date }): Promise<Activity[]>;
  insert(row: ActivityWrite, access?: ActivityWriteAccess): Promise<Activity>;
  update(row: ActivityWrite, expectedVersion: number, access?: ActivityWriteAccess): Promise<Activity>;
  softDelete(id: string, expectedVersion: number, access?: ActivityWriteAccess): Promise<Activity>;
  /** Service role. Active rows whose time overlaps the half-open range. */
  listOverlapping(range: { start: Date; end: Date }): Promise<Activity[]>;
  /**
   * User JWT, including tombstones.
   * Incremental pulls pass updatedSince. The first pull passes the window instead.
   */
  listForPull(query: { updatedSince: string | null; start: Date | null; end: Date | null }): Promise<Activity[]>;
}
