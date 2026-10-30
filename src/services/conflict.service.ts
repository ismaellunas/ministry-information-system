import { classify } from "@/domain/conflict";
import { clashNotices, marksForViewer, type ClashMark } from "@/domain/conflict-view";
import { canManageActivity } from "@/domain/activity-access";
import { AppError } from "@/domain/errors";
import type { Activity, Profile } from "@/domain/types";
import type { ActivityRepository } from "@/repositories/activity.repository";
import type { ChurchRepository } from "@/repositories/church.repository";
import type { ConflictRepository } from "@/repositories/conflict.repository";
import type { NotificationRepository } from "@/repositories/notification.repository";
import type { ProfileRepository } from "@/repositories/profile.repository";

export class ConflictService {
  constructor(
    private readonly activities: ActivityRepository,
    private readonly conflicts: ConflictRepository,
    private readonly profiles: ProfileRepository,
    private readonly churches: ChurchRepository,
    private readonly notifications: NotificationRepository
  ) {}

  async evaluateAndNotify(saved: Activity): Promise<void> {
    const overlapping = await this.activities.listOverlapping({
      start: saved.startAt,
      end: saved.endAt,
    });
    const existing = await this.conflicts.listForActivities([saved.id]);
    const current = new Set<string>();
    for (const other of overlapping) {
      if (other.id === saved.id || other.deleted) continue;
      if (classify(toLike(saved), toLike(other)) !== "CONFLICT") continue;
      current.add(other.id);
      await this.reconcile(saved, other);
    }
    for (const row of existing) {
      const otherId = row.activityId === saved.id ? row.otherActivityId : row.activityId;
      if (current.has(otherId) || row.overlapEndedAt) continue;
      await this.conflicts.markEnded(row.id);
    }
  }

  async marksFor(viewer: Profile, events: Activity[]): Promise<ClashMark[]> {
    if (events.length === 0) return [];
    const rows = await this.conflicts.listForActivities(events.map((event) => event.id));
    const known = new Map(events.map((event) => [event.id, event]));
    const missing: string[] = [];
    for (const row of rows) {
      if (!known.has(row.activityId)) missing.push(row.activityId);
      if (!known.has(row.otherActivityId)) missing.push(row.otherActivityId);
    }
    for (const activity of await this.activities.findManyByIds(missing)) known.set(activity.id, activity);
    const names = await this.churchNames(Array.from(known.values()));
    const marks: ClashMark[] = [];
    for (const row of rows) {
      const left = known.get(row.activityId);
      const right = known.get(row.otherActivityId);
      if (!left || !right) continue;
      marks.push(
        ...marksForViewer({
          viewer,
          conflictId: row.id,
          left,
          right,
          churchNames: names,
          acceptedAt: row.acceptedAt ? new Date(row.acceptedAt) : null,
          overlapEndedAt: row.overlapEndedAt ? new Date(row.overlapEndedAt) : null,
        })
      );
    }
    const visible = new Set(events.map((event) => event.id));
    return marks.filter((mark) => visible.has(mark.eventId) && !mark.ended);
  }

  async accept(actor: Profile, conflictId: string): Promise<void> {
    const row = await this.conflicts.findById(conflictId);
    if (!row || row.overlapEndedAt) throw new AppError("NOT_FOUND", "That clash is no longer open.");
    if (row.acceptedAt) return;
    const sides = await this.activities.findManyByIds([row.activityId, row.otherActivityId]);
    const left = sides.find((side) => side.id === row.activityId);
    const right = sides.find((side) => side.id === row.otherActivityId);
    if (!left || !right) throw new AppError("NOT_FOUND", "That clash is no longer open.");
    if (!canManageActivity(actor, left) && !canManageActivity(actor, right)) {
      throw new AppError("FORBIDDEN", "You cannot accept this clash.");
    }
    await this.conflicts.accept(row.id, actor.id);
  }

  private async reconcile(saved: Activity, other: Activity) {
    const pair = await this.conflicts.findPair(saved.id, other.id);
    if (!pair) {
      const created = await this.conflicts.insert({
        activityId: saved.id,
        otherActivityId: other.id,
        message: "overlap",
      });
      await this.notify(saved, other, created.reopenGeneration);
      return;
    }
    if (pair.overlapEndedAt) {
      const reopened = await this.conflicts.reopen(pair.id, pair.reopenGeneration + 1);
      await this.notify(saved, other, reopened.reopenGeneration);
    }
  }

  private async notify(left: Activity, right: Activity, generation: number) {
    const profiles = await this.profiles.listAll();
    const names = await this.churchNames([left, right]);
    for (const notice of clashNotices({ left, right, profiles, churchNames: names, generation })) {
      const data: Record<string, unknown> = { eventId: notice.eventId };
      if (!notice.redacted && notice.otherEventId) data.otherEventId = notice.otherEventId;
      await this.notifications.insertIgnore({
        userId: notice.userId,
        type: "conflict",
        title: notice.title,
        body: notice.body,
        dedupeKey: notice.dedupeKey,
        data,
      });
    }
  }

  private async churchNames(events: Activity[]) {
    const names = new Map<string, string>();
    const ids = new Set<string>();
    for (const event of events) {
      if (event.churchId) ids.add(event.churchId);
      if (event.hostChurchId) ids.add(event.hostChurchId);
    }
    for (const id of Array.from(ids)) {
      const church = await this.churches.findById(id);
      if (church) names.set(church.id, church.name);
    }
    return names;
  }
}

function toLike(activity: Activity) {
  return activity;
}
