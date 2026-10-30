import { describe, expect, it } from "vitest";
import { clashNotices, isOpenClash, marksForViewer } from "./conflict-view";
import type { Activity, Profile, UserRole } from "./types";

function person(
  id: string,
  roles: Array<{ role: UserRole; churchId?: string | null; ministryId?: number | null }>,
  active = true
): Profile {
  return {
    id,
    firstName: id,
    lastName: "User",
    phoneNumber: null,
    isActive: active,
    mustChangePassword: false,
    roles: roles.map((role, index) => ({
      id: `${id}-${index}`,
      profileId: id,
      role: role.role,
      churchId: role.churchId ?? null,
      ministryId: role.ministryId ?? null,
    })),
  };
}

function event(overrides: Partial<Activity> & { id: string }): Activity {
  return {
    title: overrides.title ?? overrides.id,
    description: null,
    location: null,
    isAllDay: false,
    scope: "LOCAL",
    visibility: "PUBLIC",
    churchId: "church-a",
    ministryId: null,
    hostChurchId: null,
    atOwnChurch: true,
    startAt: new Date("2026-03-01T06:00:00Z"),
    endAt: new Date("2026-03-01T08:00:00Z"),
    deleted: false,
    audience: null,
    createdBy: "creator",
    version: 1,
    createdAt: new Date("2026-03-01T00:00:00Z"),
    updatedAt: new Date("2026-03-01T00:00:00Z"),
    ...overrides,
  };
}

const names = new Map([["church-a", "AG Baikingon"]]);

describe("marksForViewer", () => {
  const secret = event({
    id: "private",
    title: "Secret prayer",
    visibility: "CHURCH_ONLY",
    createdBy: "rep-a",
  });
  const sectional = event({
    id: "sectional",
    title: "Sectional meeting",
    scope: "SECTIONAL",
    visibility: null,
    churchId: null,
    hostChurchId: "church-a",
    atOwnChurch: null,
    createdBy: "presbytery",
  });

  const base = {
    conflictId: "clash-1",
    left: secret,
    right: sectional,
    churchNames: names,
    acceptedAt: null,
    overlapEndedAt: null,
  };

  it("shows both titles to the church's rep", () => {
    const marks = marksForViewer({
      ...base,
      viewer: person("rep-a", [{ role: "CHURCH_REP", churchId: "church-a" }]),
    });
    expect(marks.map((mark) => mark.eventId).sort()).toEqual(["private", "sectional"]);
    const text = marks.map((mark) => mark.message).join(" ");
    expect(text).toContain("Secret prayer");
    expect(text).toContain("Sectional meeting");
    expect(marks.every((mark) => mark.otherActivityId)).toBe(true);
    expect(isOpenClash(marks[0])).toBe(true);
  });

  it("tells Admin the church is busy and omits the private title and id", () => {
    const marks = marksForViewer({
      ...base,
      viewer: person("admin", [{ role: "ADMIN" }]),
    });
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({
      eventId: "sectional",
      otherActivityId: null,
      isRedacted: true,
    });
    expect(marks[0].message).toContain("AG Baikingon is busy");
    expect(marks[0].message).not.toContain("Secret prayer");
    expect(JSON.stringify(marks[0])).not.toContain("private");
  });

  it("hides the busy notice from other churches", () => {
    const marks = marksForViewer({
      ...base,
      viewer: person("rep-b", [{ role: "CHURCH_REP", churchId: "church-b" }]),
    });
    expect(marks).toEqual([]);
  });

  it("does not treat an accepted clash as open", () => {
    const marks = marksForViewer({
      ...base,
      acceptedAt: new Date("2026-03-02T00:00:00Z"),
      viewer: person("admin", [{ role: "ADMIN" }]),
    });
    expect(isOpenClash(marks[0])).toBe(false);
  });
});

describe("clashNotices", () => {
  const secret = event({
    id: "private",
    title: "Secret prayer",
    visibility: "CHURCH_ONLY",
    createdBy: "rep-a",
  });
  const sectional = event({
    id: "sectional",
    title: "Sectional meeting",
    scope: "SECTIONAL",
    visibility: null,
    churchId: null,
    hostChurchId: "church-a",
    atOwnChurch: null,
    createdBy: "presbytery",
  });
  const profiles = [
    person("rep-a", [{ role: "CHURCH_REP", churchId: "church-a" }]),
    person("rep-b", [{ role: "CHURCH_REP", churchId: "church-b" }]),
    person("presbytery", [
      { role: "SECTION_PRESBYTERY" },
      { role: "CHURCH_REP", churchId: "church-b" },
    ]),
    person("inactive", [{ role: "CHURCH_REP", churchId: "church-a" }], false),
  ];

  it("gives the church rep the real title and everyone else a busy line", () => {
    const notices = clashNotices({
      left: secret,
      right: sectional,
      profiles,
      churchNames: names,
      generation: 1,
    });
    const rep = notices.find((notice) => notice.userId === "rep-a");
    const presbytery = notices.find((notice) => notice.userId === "presbytery");
    expect(rep?.body).toContain("Secret prayer");
    expect(rep?.otherEventId).toBe("sectional");
    expect(presbytery?.redacted).toBe(true);
    expect(presbytery?.body).toContain("AG Baikingon is busy");
    expect(presbytery?.body).not.toContain("Secret prayer");
    expect(presbytery?.otherEventId).toBeNull();
    expect(notices.some((notice) => notice.userId === "rep-b")).toBe(false);
    expect(notices.some((notice) => notice.userId === "inactive")).toBe(false);
    expect(presbytery?.dedupeKey).toBe("conflict:private:sectional:presbytery:1");
  });
});
