import type { Ministry, RoleAssignment, UserRole } from "./types";

export function roleShapeError(assignment: RoleAssignment): string | null {
  const { role, churchId, ministryId } = assignment;
  if (role === "CHURCH_REP") {
    if (!churchId || ministryId !== null) {
      return "A church representative must be assigned to a church.";
    }
    return null;
  }
  if (role === "SECTION_MINISTRY_REP") {
    if (!ministryId || churchId !== null) {
      return "A ministry representative must be assigned to a ministry.";
    }
    return null;
  }
  if (churchId !== null || ministryId !== null) {
    return `${role} cannot be tied to a church or ministry.`;
  }
  return null;
}

/**
 * Combination rules from blueprint §6.
 * Does not check uniqueness across people (one Presbytery, one rep per ministry) —
 * those need the current database.
 */
export function validateRoleSet(
  roles: RoleAssignment[],
  ministries: Pick<Ministry, "id" | "allowsChurchlessRep" | "name">[]
): string | null {
  for (const role of roles) {
    const shape = roleShapeError(role);
    if (shape) return shape;
  }

  const hasAdmin = roles.some((role) => role.role === "ADMIN");
  if (hasAdmin && roles.length > 1) {
    return "ADMIN cannot be combined with any other role.";
  }

  const churchReps = roles.filter((role) => role.role === "CHURCH_REP");
  if (churchReps.length > 1) {
    return "A person can represent at most one church.";
  }

  const ministryReps = roles.filter((role) => role.role === "SECTION_MINISTRY_REP");
  if (ministryReps.length > 1) {
    return "A person can represent at most one ministry.";
  }

  const presbytery = roles.filter((role) => role.role === "SECTION_PRESBYTERY");
  if (presbytery.length > 1) {
    return "A profile can hold the Presbytery role only once.";
  }

  if (presbytery.length === 1 && churchReps.length !== 1) {
    return "The Presbytery must also be a church representative of exactly one home church.";
  }

  for (const rep of ministryReps) {
    const ministry = ministries.find((item) => item.id === rep.ministryId);
    if (!ministry) {
      return "Unknown ministry.";
    }
    if (!ministry.allowsChurchlessRep && churchReps.length !== 1) {
      return `${ministry.name} representative must also be a church representative.`;
    }
  }

  return null;
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "SECTION_PRESBYTERY":
      return "Presbytery";
    case "SECTION_MINISTRY_REP":
      return "Ministry representative";
    case "CHURCH_REP":
      return "Church representative";
  }
}
