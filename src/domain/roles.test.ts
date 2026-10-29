import { describe, expect, it } from "vitest";
import { validateRoleSet } from "./roles";
import type { Ministry, RoleAssignment } from "./types";

const ministries: Pick<Ministry, "id" | "allowsChurchlessRep" | "name">[] = [
  { id: 1, allowsChurchlessRep: false, name: "Men's Ministry" },
  { id: 6, allowsChurchlessRep: true, name: "Evangelism" },
];

function set(roles: RoleAssignment[]) {
  return validateRoleSet(roles, ministries);
}

describe("validateRoleSet", () => {
  it("allows a lone admin", () => {
    expect(set([{ role: "ADMIN", churchId: null, ministryId: null }])).toBeNull();
  });

  it("rejects admin combined with another role", () => {
    expect(
      set([
        { role: "ADMIN", churchId: null, ministryId: null },
        { role: "CHURCH_REP", churchId: "c1", ministryId: null },
      ])
    ).toMatch(/ADMIN cannot be combined/);
  });

  it("requires a church on church rep", () => {
    expect(set([{ role: "CHURCH_REP", churchId: null, ministryId: null }])).toMatch(
      /assigned to a church/
    );
  });

  it("requires presbytery to also be a church rep", () => {
    expect(set([{ role: "SECTION_PRESBYTERY", churchId: null, ministryId: null }])).toMatch(
      /home church/
    );
  });

  it("allows presbytery with one home church", () => {
    expect(
      set([
        { role: "SECTION_PRESBYTERY", churchId: null, ministryId: null },
        { role: "CHURCH_REP", churchId: "c1", ministryId: null },
      ])
    ).toBeNull();
  });

  it("requires a church for a ministry that does not allow churchless reps", () => {
    expect(
      set([{ role: "SECTION_MINISTRY_REP", churchId: null, ministryId: 1 }])
    ).toMatch(/must also be a church representative/);
  });

  it("allows evangelism without a church", () => {
    expect(
      set([{ role: "SECTION_MINISTRY_REP", churchId: null, ministryId: 6 }])
    ).toBeNull();
  });

  it("allows a ministry rep who is also a church rep", () => {
    expect(
      set([
        { role: "CHURCH_REP", churchId: "c1", ministryId: null },
        { role: "SECTION_MINISTRY_REP", churchId: null, ministryId: 1 },
      ])
    ).toBeNull();
  });
});
