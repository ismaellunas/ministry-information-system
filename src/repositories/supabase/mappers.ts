import { decodePastorName } from "@/domain/directory";
import type { Database } from "@/lib/supabase/database.types";
import type {
  Activity,
  AuditEntry,
  Church,
  ChurchDepartmentCount,
  ChurchSummaryRow,
  Ministry,
  MinistryCode,
  Profile,
  ProfileRole,
} from "@/domain/types";

type ChurchRow = Database["public"]["Tables"]["churches"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RoleRow = Database["public"]["Tables"]["profile_roles"]["Row"];
type MinistryRow = Database["public"]["Tables"]["ministries"]["Row"];
type CountRow = Database["public"]["Tables"]["church_department_counts"]["Row"];
type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type SummaryRow = Database["public"]["Functions"]["church_summary"]["Returns"][number];

export function toChurch(row: ChurchRow): Church {
  const fromColumns = {
    firstName: row.pastor_first_name,
    lastName: row.pastor_last_name,
  };
  const decoded = decodePastorName(row.pastor_name);
  const pastorFirstName = fromColumns.firstName || decoded.firstName;
  const pastorLastName = fromColumns.lastName || decoded.lastName;
  const pastorName =
    [pastorFirstName, pastorLastName].filter(Boolean).join(" ").trim() || decoded.display;
  return {
    id: row.id,
    name: row.name,
    pastorFirstName,
    pastorLastName,
    pastorName: pastorName || null,
    pastorPhone: row.pastor_phone,
    address: row.address,
    facebookPageUrl: row.facebook_page_url,
    hotlineNumber: row.hotline_number,
    mapPinUrl: row.map_pin_url,
    logoUrl: row.logo_url,
    isActive: row.is_active,
  };
}

export function toRole(row: RoleRow): ProfileRole {
  return {
    id: row.id,
    profileId: row.profile_id,
    role: row.role,
    churchId: row.church_id,
    ministryId: row.ministry_id,
  };
}

export function toProfile(row: ProfileRow, roles: ProfileRole[]): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    roles,
  };
}

export function toMinistry(row: MinistryRow): Ministry {
  return {
    id: row.id,
    code: row.code as MinistryCode,
    name: row.name,
    tracksMembership: row.tracks_membership,
    allowsChurchlessRep: row.allows_churchless_rep,
  };
}

export function toCount(row: CountRow): ChurchDepartmentCount {
  return {
    churchId: row.church_id,
    ministryId: row.ministry_id,
    memberCount: row.member_count,
    rosterComplete: row.roster_complete,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export function toSummary(row: SummaryRow): ChurchSummaryRow {
  return {
    churchId: row.church_id,
    churchName: row.church_name,
    ministryId: row.ministry_id,
    memberCount: row.member_count,
    reported: row.reported,
    updatedAt: row.updated_at,
  };
}

export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    isAllDay: row.is_all_day,
    scope: row.scope,
    visibility: row.visibility,
    churchId: row.church_id,
    ministryId: row.ministry_id,
    hostChurchId: row.host_church_id,
    atOwnChurch: row.at_own_church,
    startAt: new Date(row.start_at),
    endAt: new Date(row.end_at),
    deleted: row.deleted_at != null,
    audience: row.audience,
    createdBy: row.created_by,
    version: row.version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toAudit(row: AuditRow): AuditEntry {
  const detail = row.detail;
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    detail:
      detail && typeof detail === "object" && !Array.isArray(detail)
        ? (detail as Record<string, unknown>)
        : null,
    createdAt: row.created_at,
  };
}
