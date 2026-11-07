import { describe, expect, it } from "vitest";
import { validateRoleSet } from "./roles";
import type { Ministry } from "./types";
import { ncmdcIdError, pastorMarkFromUserForm, rolesFromUserForm } from "./user-form";

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

describe("pastorMarkFromUserForm", () => {
  it("keeps an optional NCMDC ID only for a church representative marked as pastor", () => {
    const roles = rolesFromUserForm(form({ role_church: "on", church_id: churchId }));
    expect(pastorMarkFromUserForm(form({ role_church: "on", is_pastor: "on", ncmdc_id: "NCM-12" }), roles)).toEqual({
      isPastor: true,
      ncmdcId: "NCM-12",
    });
    expect(ncmdcIdError("NCM-12")).toBeNull();
  });

  it("allows a pastor with no NCMDC ID", () => {
    const roles = rolesFromUserForm(form({ role_church: "on", church_id: churchId }));
    expect(pastorMarkFromUserForm(form({ is_pastor: "on" }), roles)).toEqual({
      isPastor: true,
      ncmdcId: null,
    });
  });

  it("ignores a pastor mark when the person is not a church representative", () => {
    const roles = rolesFromUserForm(form({ role_ministry: "on", ministry_id: "1" }));
    expect(pastorMarkFromUserForm(form({ is_pastor: "on", ncmdc_id: "NCM-12" }), roles)).toEqual({
      isPastor: false,
      ncmdcId: null,
    });
  });

  it("rejects an NCMDC ID with spaces or symbols", () => {
    expect(ncmdcIdError("NCM 12")).toMatch(/letters, numbers, or hyphens/);
  });
});
