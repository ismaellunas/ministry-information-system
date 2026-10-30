import { AppError } from "./errors";
import type {
  ActivityLike,
  ActivityScope,
  AudienceLabel,
  EventVisibility,
  Profile,
  UserRole,
} from "./types";

export const AUDIENCE_OPTIONS: { value: AudienceLabel; label: string }[] = [
  { value: "PASTORS_ONLY", label: "Pastors Only" },
  { value: "ALL_CHURCHES", label: "All Churches" },
  { value: "PUBLIC", label: "Public" },
  { value: "MM_ONLY", label: "MM Only" },
  { value: "WM_ONLY", label: "WM Only" },
  { value: "YA_ONLY", label: "YA Only" },
  { value: "MM_AND_WM", label: "MM & WM" },
  { value: "CHRISTIAN_EDUCATION", label: "Christian Education" },
];

const ROLE_ORDER: UserRole[] = [
  "CHURCH_REP",
  "SECTION_MINISTRY_REP",
  "SECTION_PRESBYTERY",
  "ADMIN",
];

export function homeChurchId(actor: Profile): string | null {
  return churchRepChurchIds(actor)[0] ?? null;
}

export function churchRepChurchIds(actor: Profile): string[] {
  const ids: string[] = [];
  for (const role of actor.roles) {
    if (role.role === "CHURCH_REP" && role.churchId && !ids.includes(role.churchId)) ids.push(role.churchId);
  }
  return ids;
}

export function actingRoleChoices(actor: Profile): UserRole[] {
  const held = new Set(actor.roles.map((role) => role.role));
  return ROLE_ORDER.filter((role) => held.has(role));
}

export function viewerCanSeeActivity(viewer: Profile, activity: ActivityLike): boolean {
  if (activity.deleted) return false;
  if (activity.scope === "SECTIONAL") return true;
  if (activity.visibility === "PUBLIC") return true;
  return activity.visibility === "CHURCH_ONLY" && activity.churchId === homeChurchId(viewer);
}

export function creatorDisplay(
  viewer: Profile,
  activity: ActivityLike,
  creator: { id: string; firstName: string; lastName: string; phoneNumber: string | null }
): { name: string | null; phone: string | null } {
  const ownChurch = activity.churchId != null && activity.churchId === homeChurchId(viewer);
  if (viewer.id === creator.id || ownChurch) {
    return {
      name: `${creator.firstName} ${creator.lastName}`.trim(),
      phone: creator.phoneNumber,
    };
  }
  return { name: null, phone: creator.phoneNumber };
}

export function assertCanManage(
  actor: Profile,
  input: {
    actingRole: UserRole;
    scope: ActivityScope;
    visibility: EventVisibility | null;
    churchId: string | null;
    ministryId: number | null;
    isNew: boolean;
  },
  church: { isActive: boolean } | null
): void {
  if (!actor.roles.some((role) => role.role === input.actingRole)) {
    throw new AppError("FORBIDDEN", "You cannot act in that role.");
  }

  if (input.scope === "LOCAL") {
    if (!input.churchId || !input.visibility) {
      throw new AppError("VALIDATION", "A local event needs a church and a visibility.");
    }
    if (input.ministryId != null) {
      throw new AppError("VALIDATION", "A local event cannot be tied to a ministry.");
    }
    if (input.actingRole === "ADMIN") {
      if (input.visibility !== "PUBLIC") {
        throw new AppError("FORBIDDEN", "Admin cannot manage a church-only event.");
      }
    } else if (input.actingRole === "CHURCH_REP") {
      if (homeChurchId(actor) !== input.churchId) {
        throw new AppError("FORBIDDEN", "You can only manage events for your church.");
      }
    } else {
      throw new AppError("FORBIDDEN", "Use your church representative role to manage a local event.");
    }
    if (input.isNew && (!church || !church.isActive)) {
      throw new AppError("VALIDATION", "Closed churches cannot receive new events.");
    }
    return;
  }

  if (input.churchId || input.visibility) {
    throw new AppError("VALIDATION", "A sectional event is not tied to one church's calendar.");
  }
  if (input.ministryId != null) {
    if (input.actingRole === "SECTION_MINISTRY_REP") {
      const ministryId = actor.roles.find((role) => role.role === "SECTION_MINISTRY_REP")?.ministryId;
      if (ministryId !== input.ministryId) {
        throw new AppError("FORBIDDEN", "You can only manage events for your ministry.");
      }
      return;
    }
    if (input.actingRole === "ADMIN" || input.actingRole === "SECTION_PRESBYTERY") return;
    throw new AppError("FORBIDDEN", "You cannot manage that ministry event.");
  }
  if (input.actingRole === "ADMIN" || input.actingRole === "SECTION_PRESBYTERY") return;
  throw new AppError("FORBIDDEN", "Only Presbytery or Admin can manage a general sectional event.");
}

export function canManageActivity(actor: Profile, activity: ActivityLike): boolean {
  for (const role of actor.roles) {
    try {
      assertCanManage(
        actor,
        {
          actingRole: role.role,
          scope: activity.scope,
          visibility: activity.visibility,
          churchId: activity.churchId,
          ministryId: activity.ministryId,
          isNew: false,
        },
        { isActive: true }
      );
      return true;
    } catch {
      // Try the next role this person holds.
    }
  }
  return false;
}
