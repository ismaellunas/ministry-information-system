import { randomUUID } from "crypto";
import { assertCanManage, canManageActivity, churchRepChurchIds, creatorDisplay } from "@/domain/activity-access";
import { resolveActivityBounds } from "@/domain/activity-bounds";
import { classify } from "@/domain/conflict";
import { marksForViewer } from "@/domain/conflict-view";
import { AppError } from "@/domain/errors";
import type {
  Activity,
  ActivityScope,
  AudienceLabel,
  EventVisibility,
  PresbyteryHat,
  Profile,
  UserRole,
} from "@/domain/types";
import type { ActivityRepository, ActivityWrite, ActivityWriteAccess } from "@/repositories/activity.repository";
import type { AuditRepository } from "@/repositories/audit.repository";
import type { ChurchRepository } from "@/repositories/church.repository";
import type { MinistryRepository } from "@/repositories/ministry.repository";
import type { ProfileRepository } from "@/repositories/profile.repository";
import type { ConflictService } from "./conflict.service";

function writeAccess(role: UserRole, write: ActivityWrite): ActivityWriteAccess {
  if (role === "ADMIN" && write.scope === "LOCAL" && write.visibility === "PUBLIC") return "service";
  return "user";
}

const AUDIENCES = new Set<AudienceLabel>([
  "PASTORS_ONLY",
  "ALL_CHURCHES",
  "PUBLIC",
  "MM_ONLY",
  "WM_ONLY",
  "YA_ONLY",
  "MM_AND_WM",
  "CHRISTIAN_EDUCATION",
]);

export interface ActivityInput {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  isAllDay: boolean;
  startAt: string;
  endAt: string;
  scope: ActivityScope;
  visibility?: EventVisibility | null;
  churchId?: string | null;
  ministryId?: number | null;
  hostChurchId?: string | null;
  atOwnChurch?: boolean | null;
  audience?: AudienceLabel | null;
  actingRole: UserRole;
  expectedVersion?: number;
}

export class ActivityService {
  constructor(
    private readonly actor: Profile,
    private readonly activities: ActivityRepository,
    private readonly churches: ChurchRepository,
    private readonly ministries: MinistryRepository,
    private readonly profiles: ProfileRepository,
    private readonly conflicts: ConflictService,
    private readonly audit: AuditRepository
  ) {}

  async list(range: { start: Date; end: Date }, hat: PresbyteryHat) {
    let events = await this.activities.listVisible(range);
    const sectionalHat =
      hat === "section" && this.actor.roles.some((role) => role.role === "SECTION_PRESBYTERY");
    if (sectionalHat) events = events.filter((event) => event.visibility !== "CHURCH_ONLY");
    const marks = await this.conflicts.marksFor(this.actor, events);
    return { events, marks };
  }

  async get(id: string) {
    const activity = await this.activities.findById(id);
    if (!activity) throw new AppError("NOT_FOUND", "Event not found.");
    const creator = await this.profiles.findById(activity.createdBy);
    const marks = await this.conflicts.marksFor(this.actor, [activity]);
    return {
      activity,
      creator: creator
        ? creatorDisplay(this.actor, activity, creator)
        : { name: null, phone: null },
      marks,
      canManage: canManageActivity(this.actor, activity),
    };
  }

  async preview(input: ActivityInput): Promise<string[]> {
    const draft = await this.toActivity(input, true);
    const overlapping = await this.activities.listOverlapping({
      start: draft.startAt,
      end: draft.endAt,
    });
    const names = new Map<string, string>();
    for (const id of [draft.churchId, draft.hostChurchId]) {
      if (!id) continue;
      const church = await this.churches.findById(id);
      if (church) names.set(church.id, church.name);
    }
    const messages: string[] = [];
    for (const other of overlapping) {
      if (other.id === draft.id || classify(draft, other) !== "CONFLICT") continue;
      if (other.churchId) {
        const church = await this.churches.findById(other.churchId);
        if (church) names.set(church.id, church.name);
      }
      for (const mark of marksForViewer({
        viewer: this.actor,
        conflictId: "preview",
        left: draft,
        right: other,
        churchNames: names,
        acceptedAt: null,
        overlapEndedAt: null,
      })) {
        if (mark.eventId === draft.id) messages.push(mark.message);
      }
    }
    return Array.from(new Set(messages));
  }

  async save(input: ActivityInput): Promise<Activity> {
    const existing = input.id ? await this.activities.findById(input.id) : null;
    // A client UUID with no base version is a create. Replay of that create finds the row and updates it.
    if (!existing && input.expectedVersion != null) {
      throw new AppError("NOT_FOUND", "Event not found.");
    }
    if (existing && !canManageActivity(this.actor, existing)) {
      throw new AppError("FORBIDDEN", "You cannot edit this event.");
    }
    const write = await this.toWrite(input, !existing, existing?.createdBy ?? this.actor.id);
    const access = writeAccess(input.actingRole, write);
    const saved = existing
      ? await this.activities.update(write, input.expectedVersion ?? existing.version, access)
      : await this.activities.insert(write, access);
    await this.afterWrite(saved, existing ? "activity.update" : "activity.save");
    return saved;
  }

  async remove(id: string, expectedVersion: number): Promise<void> {
    const existing = await this.activities.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", "Event not found.");
    if (!canManageActivity(this.actor, existing)) {
      throw new AppError("FORBIDDEN", "You cannot remove this event.");
    }
    const access: ActivityWriteAccess =
      this.actor.roles.some((role) => role.role === "ADMIN") &&
      existing.scope === "LOCAL" &&
      existing.visibility === "PUBLIC"
        ? "service"
        : "user";
    await this.activities.softDelete(id, expectedVersion, access);
    await this.afterWrite(
      { ...existing, deleted: true, version: existing.version + 1, updatedAt: new Date() },
      "activity.remove"
    );
  }

  private async afterWrite(saved: Activity, action: string) {
    try {
      await this.conflicts.evaluateAndNotify(saved);
    } catch (error) {
      console.error("activity.notify_failed", saved.id, error instanceof Error ? error.message : "error");
    }
    try {
      await this.audit.record(this.actor.id, action, "activity", saved.id, null);
    } catch (error) {
      console.error("activity.audit_failed", saved.id, error instanceof Error ? error.message : "error");
    }
  }

  private async toActivity(input: ActivityInput, isNew: boolean): Promise<Activity> {
    const write = await this.toWrite(input, isNew, this.actor.id);
    const now = new Date();
    return {
      ...write,
      id: input.id ?? "preview",
      deleted: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async toWrite(input: ActivityInput, isNew: boolean, createdBy: string): Promise<ActivityWrite> {
    const title = input.title.trim();
    if (!title) throw new AppError("VALIDATION", "Enter a title.");
    const scope = input.scope;
    const churchId = scope === "LOCAL" ? churchFor(this.actor, input) : null;
    const church = churchId ? await this.churches.findById(churchId) : null;
    if (scope === "LOCAL" && churchId && !church) throw new AppError("VALIDATION", "Choose a church.");
    const ministryId =
      scope === "SECTIONAL"
        ? input.actingRole === "SECTION_MINISTRY_REP"
          ? this.actor.roles.find((role) => role.role === "SECTION_MINISTRY_REP")?.ministryId ?? null
          : input.ministryId ?? null
        : null;
    if (ministryId != null) {
      const known = await this.ministries.listAll();
      if (!known.some((ministry) => ministry.id === ministryId)) {
        throw new AppError("VALIDATION", "Choose a ministry.");
      }
    }
    const hostChurchId = scope === "SECTIONAL" ? input.hostChurchId ?? null : null;
    if (hostChurchId) {
      const host = await this.churches.findById(hostChurchId);
      if (!host?.isActive) throw new AppError("VALIDATION", "Choose an active host church.");
    }
    const visibility = scope === "LOCAL" ? (input.actingRole === "ADMIN" ? "PUBLIC" : input.visibility ?? "PUBLIC") : null;
    assertCanManage(
      this.actor,
      { actingRole: input.actingRole, scope, visibility, churchId, ministryId, isNew },
      church
    );
    const bounds = resolveActivityBounds(input);
    const audience = input.audience && AUDIENCES.has(input.audience) ? input.audience : null;
    return {
      id: input.id ?? randomUUID(),
      title,
      description: blank(input.description),
      location: blank(input.location),
      startAt: bounds.start,
      endAt: bounds.end,
      isAllDay: input.isAllDay,
      scope,
      visibility,
      churchId,
      ministryId,
      hostChurchId,
      atOwnChurch: scope === "LOCAL" ? input.atOwnChurch !== false : null,
      audience,
      createdBy,
    };
  }
}

function churchFor(actor: Profile, input: ActivityInput): string | null {
  if (input.actingRole !== "CHURCH_REP") return input.churchId ?? null;
  const allowed = churchRepChurchIds(actor);
  if (input.churchId && allowed.includes(input.churchId)) return input.churchId;
  return allowed[0] ?? null;
}

function blank(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
