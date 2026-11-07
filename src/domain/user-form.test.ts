import { describe, expect, it } from "vitest";
import { validateRoleSet } from "./roles";
import type { Ministry } from "./types";
import { rolesFromUserForm } from "./user-form";

const ministries: Pick<Ministry, "id" | "allowsChurchlessRep" | "name">[] = [
  { id: 1, allowsChurchlessRep: false, name: "Men's Ministry" },
];

const churchId = "11111111-1111-4111-8111-111111111111";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("rolesFromUserForm", () => {
  it("counts the selected church as the home church when the church-rep checkbox is omitted", () => {
    const roles = rolesFromUserForm(form({ role_presbytery: "on", church_id: churchId }));
    expect(roles).toEqual([
      { role: "CHURCH_REP", churchId, ministryId: null },
      { role: "SECTION_PRESBYTERY", churchId: null, ministryId: null },
    ]);
    expect(validateRoleSet(roles, ministries)).toBeNull();
  });

  it("does not add the home church twice when the church-rep checkbox is also sent", () => {
    const roles = rolesFromUserForm(
      form({ role_church: "on", role_presbytery: "on", church_id: churchId })
    );
    expect(roles.filter((role) => role.role === "CHURCH_REP")).toHaveLength(1);
    expect(validateRoleSet(roles, ministries)).toBeNull();
  });

  it("still requires a home church when Presbytery is submitted without a church", () => {
    const roles = rolesFromUserForm(form({ role_presbytery: "on" }));
    expect(roles).toEqual([{ role: "SECTION_PRESBYTERY", churchId: null, ministryId: null }]);
    expect(validateRoleSet(roles, ministries)).toBe(
      "The Presbytery must also represent a home church."
    );
  });
});
