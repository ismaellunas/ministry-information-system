import type { RoleAssignment } from "./types";

const NCMDC_ID = /^[A-Za-z0-9-]{1,40}$/;

/**
 * Roles from the create-user form.
 * Presbytery must also be a church rep. The church dropdown is that home church,
 * even when the church-rep checkbox is omitted (it is disabled while Presbytery is on,
 * and disabled controls are left out of FormData).
 */
export function rolesFromUserForm(formData: FormData): RoleAssignment[] {
  const roles: RoleAssignment[] = [];
  if (formData.get("role_admin") === "on") {
    roles.push({ role: "ADMIN", churchId: null, ministryId: null });
    return roles;
  }

  const churchId = String(formData.get("church_id") ?? "") || null;
  const presbytery = formData.get("role_presbytery") === "on";
  const churchRep = formData.get("role_church") === "on" || (presbytery && churchId !== null);
  if (churchRep) {
    roles.push({ role: "CHURCH_REP", churchId, ministryId: null });
  }
  if (presbytery) {
    roles.push({ role: "SECTION_PRESBYTERY", churchId: null, ministryId: null });
  }
  if (formData.get("role_ministry") === "on") {
    const ministryId = Number(formData.get("ministry_id"));
    roles.push({
      role: "SECTION_MINISTRY_REP",
      churchId: null,
      ministryId: Number.isFinite(ministryId) ? ministryId : null,
    });
  }
  return roles;
}

/** A pastor is a church representative. The NCMDC ID is optional for any church representative. */
export function pastorMarkFromUserForm(
  formData: FormData,
  roles: RoleAssignment[]
): { isPastor: boolean; ncmdcId: string | null } {
  const churchRep = roles.some((role) => role.role === "CHURCH_REP");
  const isPastor = churchRep && formData.get("is_pastor") === "on";
  const raw = String(formData.get("ncmdc_id") ?? "").trim();
  if (!churchRep) return { isPastor: false, ncmdcId: null };
  return { isPastor, ncmdcId: raw || null };
}

export function ncmdcIdError(ncmdcId: string | null): string | null {
  if (ncmdcId == null) return null;
  if (!NCMDC_ID.test(ncmdcId)) {
    return "Enter the NCMDC ID with letters, numbers, or hyphens.";
  }
  return null;
}
