import { sameLocation } from "./conflict";
import type { Activity, Profile } from "./types";
import { formatManila } from "./time";

export interface ClashMark {
  conflictId: string;
  eventId: string;
  otherActivityId: string | null;
  message: string;
  isRedacted: boolean;
  accepted: boolean;
  ended: boolean;
}

export interface ClashNotice {
  userId: string;
  title: string;
  body: string;
  eventId: string;
  otherEventId: string | null;
  redacted: boolean;
  dedupeKey: string;
}

export function conflictDedupeKey(a: string, b: string, userId: string, generation: number): string {
  const [min, max] = a < b ? [a, b] : [b, a];
  return `conflict:${min}:${max}:${userId}:${generation}`;
}

export function isOpenClash(mark: { accepted: boolean; ended: boolean }): boolean {
  return !mark.accepted && !mark.ended;
}

export function marksForViewer(args: {
  viewer: Profile;
  conflictId: string;
  left: Activity;
  right: Activity;
  churchNames: Map<string, string>;
  acceptedAt: Date | null;
  overlapEndedAt: Date | null;
}): ClashMark[] {
  const { viewer, left, right } = args;
  if (left.deleted || right.deleted) return [];
  const local = left.scope === "LOCAL" ? left : right.scope === "LOCAL" ? right : null;
  const sectional = left.scope === "SECTIONAL" ? left : right.scope === "SECTIONAL" ? right : null;
  const busy =
    local != null &&
    sectional != null &&
    local.visibility === "CHURCH_ONLY" &&
    sameLocation(local, sectional);

  if (busy && local && sectional) {
    if (canSee(viewer, local)) {
      return [
        mark(args, local.id, sectional.id, overlapMessage(sectional, local), false),
        mark(args, sectional.id, local.id, overlapMessage(local, sectional), false),
      ];
    }
    const privileged =
      viewer.roles.some((role) => role.role === "ADMIN" || role.role === "SECTION_PRESBYTERY") ||
      viewer.id === sectional.createdBy;
    if (privileged && canSee(viewer, sectional)) {
      const churchName = churchLabel(local.churchId, args.churchNames);
      return [mark(args, sectional.id, null, `${churchName} is busy (${whenLabel(local)}).`, true)];
    }
    return [];
  }

  if (!canSee(viewer, left) || !canSee(viewer, right)) return [];
  return [
    mark(args, left.id, right.id, overlapMessage(right, left), false),
    mark(args, right.id, left.id, overlapMessage(left, right), false),
  ];
}

export function clashNotices(args: {
  left: Activity;
  right: Activity;
  profiles: Profile[];
  churchNames: Map<string, string>;
  generation: number;
}): ClashNotice[] {
  const { left, right, generation } = args;
  const local = left.scope === "LOCAL" ? left : right.scope === "LOCAL" ? right : null;
  const sectional = left.scope === "SECTIONAL" ? left : right.scope === "SECTIONAL" ? right : null;
  const busy =
    local != null &&
    sectional != null &&
    local.visibility === "CHURCH_ONLY" &&
    sameLocation(local, sectional);
  const byUser = new Map<string, ClashNotice>();

  const put = (notice: ClashNotice) => {
    const previous = byUser.get(notice.userId);
    if (!previous || (previous.redacted && !notice.redacted)) byUser.set(notice.userId, notice);
  };

  if (busy && local && sectional) {
    for (const rep of churchReps(args.profiles, local.churchId)) {
      put(fullNotice(rep.id, local, sectional, generation));
    }
    const redacted = new Set<string>();
    for (const person of presbyters(args.profiles)) redacted.add(person.id);
    const creator = active(args.profiles).find((person) => person.id === sectional.createdBy);
    if (creator) redacted.add(creator.id);
    for (const userId of Array.from(redacted)) {
      put(busyNotice(userId, sectional, local, churchLabel(local.churchId, args.churchNames), generation));
    }
    return Array.from(byUser.values());
  }

  if (local && sectional) {
    for (const rep of churchReps(args.profiles, local.churchId)) put(fullNotice(rep.id, local, sectional, generation));
    for (const person of presbyters(args.profiles)) put(fullNotice(person.id, sectional, local, generation));
    const creator = active(args.profiles).find((person) => person.id === sectional.createdBy);
    if (creator) put(fullNotice(creator.id, sectional, local, generation));
    return Array.from(byUser.values());
  }

  if (local && !sectional) {
    const other = left.id === local.id ? right : left;
    for (const rep of churchReps(args.profiles, local.churchId)) put(fullNotice(rep.id, local, other, generation));
    return Array.from(byUser.values());
  }

  for (const person of presbyters(args.profiles)) put(fullNotice(person.id, left, right, generation));
  for (const id of [left.createdBy, right.createdBy]) {
    const creator = active(args.profiles).find((person) => person.id === id);
    if (creator) put(fullNotice(creator.id, left, right, generation));
  }
  return Array.from(byUser.values());
}

function canSee(viewer: Profile, activity: Activity): boolean {
  if (activity.deleted) return false;
  if (activity.scope === "SECTIONAL" || activity.visibility === "PUBLIC") return true;
  const home = viewer.roles.find((role) => role.role === "CHURCH_REP")?.churchId;
  return activity.churchId === home;
}

function churchLabel(churchId: string | null, names: Map<string, string>): string {
  if (!churchId) return "A church";
  return names.get(churchId) ?? "A church";
}

function whenLabel(activity: Activity): string {
  if (activity.isAllDay) return formatManila(activity.startAt, "MMM d, yyyy");
  return `${formatManila(activity.startAt, "MMM d, h:mm a")}–${formatManila(activity.endAt, "h:mm a")}`;
}

function overlapMessage(other: Activity, _side: Activity): string {
  return `${other.title} overlaps this time (${whenLabel(other)}).`;
}

function mark(
  args: {
    conflictId: string;
    acceptedAt: Date | null;
    overlapEndedAt: Date | null;
  },
  eventId: string,
  otherActivityId: string | null,
  message: string,
  isRedacted: boolean
): ClashMark {
  return {
    conflictId: args.conflictId,
    eventId,
    otherActivityId,
    message,
    isRedacted,
    accepted: args.acceptedAt != null,
    ended: args.overlapEndedAt != null,
  };
}

function fullNotice(userId: string, focus: Activity, other: Activity, generation: number): ClashNotice {
  return {
    userId,
    title: "Schedule clash",
    body: `${focus.title} overlaps ${other.title} (${whenLabel(focus)}).`,
    eventId: focus.id,
    otherEventId: other.id,
    redacted: false,
    dedupeKey: conflictDedupeKey(focus.id, other.id, userId, generation),
  };
}

function busyNotice(
  userId: string,
  sectional: Activity,
  local: Activity,
  churchName: string,
  generation: number
): ClashNotice {
  return {
    userId,
    title: "Schedule clash",
    body: `${churchName} is busy (${whenLabel(local)}).`,
    eventId: sectional.id,
    otherEventId: null,
    redacted: true,
    dedupeKey: conflictDedupeKey(sectional.id, local.id, userId, generation),
  };
}

function active(profiles: Profile[]): Profile[] {
  return profiles.filter((profile) => profile.isActive);
}

function churchReps(profiles: Profile[], churchId: string | null): Profile[] {
  if (!churchId) return [];
  return active(profiles).filter((profile) =>
    profile.roles.some((role) => role.role === "CHURCH_REP" && role.churchId === churchId)
  );
}

function presbyters(profiles: Profile[]): Profile[] {
  return active(profiles).filter((profile) =>
    profile.roles.some((role) => role.role === "SECTION_PRESBYTERY")
  );
}
