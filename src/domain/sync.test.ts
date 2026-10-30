import { describe, expect, it } from "vitest";
import { formatManila } from "./time";
import type { ActivityLike, Profile, ProfileRole } from "./types";
import {
  OUTBOX_TTL_MS,
  advanceCursor,
  firstPullWindow,
  isAfterCursor,
  isOutboxExpired,
  mutationsToPush,
  provisionalOverlapNotes,
  visibleInPull,
  type QueuedMutation,
} from "./sync";

function role(roleName: ProfileRole["role"], churchId: string | null = null): ProfileRole {
  return { id: `${roleName}-${churchId ?? "none"}`, profileId: "person", role: roleName, churchId, ministryId: null };
}

function person(roles: ProfileRole[]): Profile {
  return {
    id: "person",
    firstName: "Ada",
    lastName: "Rep",
    phoneNumber: null,
    isActive: true,
    mustChangePassword: false,
    roles,
  };
}

function like(partial: Partial<ActivityLike> & Pick<ActivityLike, "id"> & { title?: string }): ActivityLike & { title?: string } {
  return {
    scope: "LOCAL",
    visibility: "PUBLIC",
    churchId: "church-a",
    ministryId: null,
    hostChurchId: null,
    atOwnChurch: true,
    startAt: new Date("2026-10-30T01:00:00.000Z"),
    endAt: new Date("2026-10-30T02:00:00.000Z"),
    deleted: false,
    ...partial,
  };
}

describe("sync cursor", () => {
  const cursor = { updatedAt: "2026-10-30T01:00:00.000Z", id: "b" };

  it("keeps a later id when the timestamp matches", () => {
    expect(isAfterCursor({ updatedAt: "2026-10-30T01:00:00.000Z", id: "c" }, cursor)).toBe(true);
    expect(isAfterCursor({ updatedAt: "2026-10-30T01:00:00.000Z", id: "a" }, cursor)).toBe(false);
    expect(isAfterCursor(cursor, cursor)).toBe(false);
  });

  it("treats an equal instant in another ISO form as the same time", () => {
    expect(isAfterCursor({ updatedAt: "2026-10-30T01:00:00+00:00", id: "c" }, cursor)).toBe(true);
    expect(isAfterCursor({ updatedAt: "2026-10-30T01:00:00+00:00", id: "a" }, cursor)).toBe(false);
  });

  it("advances to the newest row", () => {
    expect(
      advanceCursor(
        [
          { updatedAt: "2026-10-30T01:00:00.000Z", id: "a" },
          { updatedAt: "2026-10-30T02:00:00.000Z", id: "a" },
        ],
        cursor
      )
    ).toEqual({ updatedAt: "2026-10-30T02:00:00.000Z", id: "a" });
  });
});

describe("outbox expiry", () => {
  const now = new Date("2026-10-30T00:00:00.000Z");

  it("fails a change queued longer than 30 days", () => {
    expect(isOutboxExpired(new Date(now.getTime() - OUTBOX_TTL_MS - 1).toISOString(), now)).toBe(true);
    expect(isOutboxExpired(new Date(now.getTime() - OUTBOX_TTL_MS).toISOString(), now)).toBe(false);
  });
});

describe("first pull window", () => {
  it("runs from the previous Manila month through the next 12 months", () => {
    const window = firstPullWindow(new Date("2026-10-30T02:00:00.000Z"));
    expect(formatManila(window.start, "yyyy-MM-dd")).toBe("2026-09-01");
    expect(formatManila(window.end, "yyyy-MM-dd")).toBe("2027-11-01");
  });

  it("crosses the year when the current month is January", () => {
    const window = firstPullWindow(new Date("2026-01-15T02:00:00.000Z"));
    expect(formatManila(window.start, "yyyy-MM-dd")).toBe("2025-12-01");
    expect(formatManila(window.end, "yyyy-MM-dd")).toBe("2027-02-01");
  });
});

describe("pull visibility", () => {
  const hidden = like({
    id: "private",
    visibility: "CHURCH_ONLY",
    churchId: "church-a",
    deleted: true,
  });

  it("keeps a church-only tombstone for that church's rep and drops it for everyone else", () => {
    expect(visibleInPull(person([role("CHURCH_REP", "church-a")]), hidden)).toBe(true);
    expect(visibleInPull(person([role("CHURCH_REP", "church-b")]), hidden)).toBe(false);
    expect(visibleInPull(person([role("ADMIN")]), hidden)).toBe(false);
    expect(visibleInPull(person([role("SECTION_PRESBYTERY", "church-a")]), hidden)).toBe(false);
  });

  it("includes public and sectional rows", () => {
    const viewer = person([role("CHURCH_REP", "church-b")]);
    expect(visibleInPull(viewer, like({ id: "public" }))).toBe(true);
    expect(visibleInPull(viewer, like({ id: "section", scope: "SECTIONAL", visibility: null, churchId: null }))).toBe(true);
  });
});

describe("mutationsToPush", () => {
  it("sends the latest payload for a create that was edited before acknowledgement", () => {
    const first: QueuedMutation = {
      entityId: "event-1",
      op: "save",
      baseVersion: null,
      queuedAt: "2026-10-01T00:00:00.000Z",
      payload: { title: "Draft", isAllDay: false, startAt: "2026-10-30T09:00", endAt: "2026-10-30T10:00", scope: "LOCAL", actingRole: "CHURCH_REP" },
    };
    const edited: QueuedMutation = {
      ...first,
      queuedAt: "2026-10-02T00:00:00.000Z",
      payload: { ...first.payload, title: "Elders" },
    };
    const [pushed] = mutationsToPush([first, edited]);
    expect(pushed.payload.title).toBe("Elders");
    expect(pushed.queuedAt).toBe(first.queuedAt);
    expect(pushed.baseVersion).toBeNull();
  });
});

describe("provisional overlap", () => {
  it("warns from the events on the phone and says other private events are absent", () => {
    const draft = like({ id: "new", churchId: "church-a" });
    const other = like({ id: "existing", title: "Friday prayer", churchId: "church-a" });
    const notes = provisionalOverlapNotes(draft, [other]);
    expect(notes[0]).toContain("Friday prayer");
    expect(notes.at(-1)).toContain("private events are not on this phone");
  });
});
