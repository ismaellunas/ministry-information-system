import type { RoleAssignment } from "./types";

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
