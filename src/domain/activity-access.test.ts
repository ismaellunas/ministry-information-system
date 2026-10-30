import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { assertCanManage, canManageActivity, churchRepChurchIds, creatorDisplay, viewerCanSeeActivity } from "./activity-access";
import type { ActivityLike, Profile, UserRole } from "./types";

function person(roles: Profile["roles"], id = "user-1"): Profile {
  return {
    id,
    firstName: "Ada",
    lastName: "Pastor",
    phoneNumber: "09170000000",
    isActive: true,
    mustChangePassword: false,
    roles,
  };
}

function role(role: UserRole, churchId: string | null = null, ministryId: number | null = null): Profile["roles"][number] {
  return { id: `${role}-row`, profileId: "user-1", role, churchId, ministryId };
}

function local(overrides: Partial<ActivityLike> = {}): ActivityLike {
  return {
    id: "event-1",
    scope: "LOCAL",
    visibility: "PUBLIC",
    churchId: "church-a",
    ministryId: null,
    hostChurchId: null,
    atOwnChurch: true,
    startAt: new Date("2026-03-01T00:00:00Z"),
    endAt: new Date("2026-03-01T04:00:00Z"),
    deleted: false,
    ...overrides,
  };
}

describe("churchRepChurchIds", () => {
  it("lists each church once", () => {
    const actor = person([role("CHURCH_REP", "church-a"), role("CHURCH_REP", "church-a"), role("SECTION_MINISTRY_REP", null, 1)]);
    expect(churchRepChurchIds(actor)).toEqual(["church-a"]);
  });
});

describe("assertCanManage", () => {
  const open = { isActive: true };

  it("lets a church rep manage their own local event", () => {
    const actor = person([role("CHURCH_REP", "church-a")]);
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "CHURCH_REP", scope: "LOCAL", visibility: "CHURCH_ONLY", churchId: "church-a", ministryId: null, isNew: true },
        open
      )
    ).not.toThrow();
  });

  it("blocks a church rep from another church and from sectional events", () => {
    const actor = person([role("CHURCH_REP", "church-a")]);
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "CHURCH_REP", scope: "LOCAL", visibility: "PUBLIC", churchId: "church-b", ministryId: null, isNew: true },
        open
      )
    ).toThrow(AppError);
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "CHURCH_REP", scope: "SECTIONAL", visibility: null, churchId: null, ministryId: null, isNew: true },
        null
      )
    ).toThrow(/general sectional/);
  });

  it("blocks Admin from church-only and allows public local and general sectional", () => {
    const actor = person([role("ADMIN")]);
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "ADMIN", scope: "LOCAL", visibility: "CHURCH_ONLY", churchId: "church-a", ministryId: null, isNew: true },
        open
      )
    ).toThrow(/church-only/);
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "ADMIN", scope: "LOCAL", visibility: "PUBLIC", churchId: "church-a", ministryId: null, isNew: true },
        open
      )
    ).not.toThrow();
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "ADMIN", scope: "SECTIONAL", visibility: null, churchId: null, ministryId: null, isNew: true },
        null
      )
    ).not.toThrow();
  });

  it("limits a ministry rep to that ministry", () => {
    const actor = person([role("SECTION_MINISTRY_REP", null, 2), role("CHURCH_REP", "church-a")]);
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "SECTION_MINISTRY_REP", scope: "SECTIONAL", visibility: null, churchId: null, ministryId: 2, isNew: true },
        null
      )
    ).not.toThrow();
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "SECTION_MINISTRY_REP", scope: "SECTIONAL", visibility: null, churchId: null, ministryId: 3, isNew: true },
        null
      )
    ).toThrow(/your ministry/);
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "SECTION_MINISTRY_REP", scope: "SECTIONAL", visibility: null, churchId: null, ministryId: null, isNew: true },
        null
      )
    ).toThrow(/general sectional/);
  });

  it("refuses a new event on a closed church", () => {
    const actor = person([role("CHURCH_REP", "church-a")]);
    expect(() =>
      assertCanManage(
        actor,
        { actingRole: "CHURCH_REP", scope: "LOCAL", visibility: "PUBLIC", churchId: "church-a", ministryId: null, isNew: true },
        { isActive: false }
      )
    ).toThrow(/Closed churches/);
  });
});

describe("visibility and creator", () => {
  it("hides church-only events from Admin and other churches", () => {
    const hidden = local({ visibility: "CHURCH_ONLY" });
    expect(viewerCanSeeActivity(person([role("ADMIN")], "admin"), hidden)).toBe(false);
    expect(viewerCanSeeActivity(person([role("CHURCH_REP", "church-b")], "other"), hidden)).toBe(false);
    expect(viewerCanSeeActivity(person([role("CHURCH_REP", "church-a")]), hidden)).toBe(true);
  });

  it("shows phone and hides the name for another church", () => {
    const event = local();
    const creator = { id: "creator", firstName: "Juan", lastName: "Dela Cruz", phoneNumber: "(0917) 1234 567" };
    expect(creatorDisplay(person([role("CHURCH_REP", "church-b")], "other"), event, creator)).toEqual({
      name: null,
      phone: "(0917) 1234 567",
    });
    expect(creatorDisplay(person([role("CHURCH_REP", "church-a")]), event, creator).name).toBe(
      "Juan Dela Cruz"
    );
  });

  it("lets Admin manage a sectional event already saved", () => {
    const sectional: ActivityLike = { ...local(), id: "sec", scope: "SECTIONAL", visibility: null, churchId: null };
    expect(canManageActivity(person([role("ADMIN")], "admin"), sectional)).toBe(true);
    expect(canManageActivity(person([role("ADMIN")], "admin"), local({ visibility: "CHURCH_ONLY" }))).toBe(false);
  });
});
