// Pure domain types — zero imports from Supabase, Dexie, React, or Next.js

export type UserRole =
  | "ADMIN"
  | "SECTION_PRESBYTERY"
  | "SECTION_MINISTRY_REP"
  | "CHURCH_REP";

export type ActivityScope = "LOCAL" | "SECTIONAL";
export type EventVisibility = "CHURCH_ONLY" | "PUBLIC";
export type AudienceLabel =
  | "PASTORS_ONLY"
  | "ALL_CHURCHES"
  | "PUBLIC"
  | "MM_ONLY"
  | "WM_ONLY"
  | "YA_ONLY"
  | "MM_AND_WM"
  | "CHRISTIAN_EDUCATION";

export type MinistryCode =
  | "MM"
  | "WM"
  | "YA"
  | "CE"
  | "MUSIC"
  | "EVANGELISM";

export interface Ministry {
  id: number;
  code: MinistryCode;
  name: string;
  tracksMembership: boolean;
  allowsChurchlessRep: boolean;
}

export interface Church {
  id: string;
  name: string;
  pastorName: string | null;
  pastorPhone: string | null;
  address: string | null;
  facebookPageUrl: string | null;
  hotlineNumber: string | null;
  mapPinUrl: string | null;
  logoUrl: string | null;
  isActive: boolean;
}

export interface ProfileRole {
  id: string;
  profileId: string;
  role: UserRole;
  churchId: string | null;
  ministryId: number | null;
}

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  roles: ProfileRole[];
}

/** The acting identity for a single request/mutation. */
export interface Actor {
  profileId: string;
  role: UserRole;
  /** Set when acting as CHURCH_REP or SECTION_PRESBYTERY (home church). */
  churchId: string | null;
  /** Set when acting as SECTION_MINISTRY_REP. */
  ministryId: number | null;
}

/** Viewer is a read-only actor used for querying visible events. */
export type Viewer = Actor;

export interface ActivityLike {
  id: string;
  scope: ActivityScope;
  visibility: EventVisibility | null;
  churchId: string | null;
  ministryId: number | null;
  hostChurchId: string | null;
  atOwnChurch: boolean | null;
  startAt: Date;
  endAt: Date;
  deleted: boolean;
}

export interface Activity extends ActivityLike {
  title: string;
  description: string | null;
  location: string | null;
  isAllDay: boolean;
  audience: AudienceLabel | null;
  createdBy: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityDraft {
  /** Client-supplied UUID for offline idempotency. */
  id?: string;
  title: string;
  description?: string;
  location?: string;
  isAllDay: boolean;
  /**
   * Timed events: ISO 8601 string.
   * All-day events: civil date "YYYY-MM-DD" — server computes Manila bounds.
   */
  startAt: string;
  endAt: string;
  scope: ActivityScope;
  visibility?: EventVisibility; // LOCAL only
  churchId?: string;            // LOCAL only
  ministryId?: number;          // SECTIONAL ministry event
  hostChurchId?: string;        // SECTIONAL only
  atOwnChurch?: boolean;        // LOCAL only
  audience?: AudienceLabel;
  actingRole: UserRole;
}

export interface ConflictSummary {
  conflictId: string;
  /** null when the other side is redacted (busy notice). */
  otherActivityId: string | null;
  message: string;
  isRedacted: boolean;
  acceptedAt: Date | null;
  overlapEndedAt: Date | null;
  reopenGeneration: number;
}
