import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors";
import type { Activity, Profile } from "@/domain/types";
import type { ActivityRepository } from "@/repositories/activity.repository";
import { SyncService } from "./sync.service";
import type { QueuedMutation } from "@/domain/sync";

const rep: Profile = {
  id: "rep",
  firstName: "Mia",
  lastName: "Rep",
  phoneNumber: null,
  isActive: true,
  mustChangePassword: false,
  roles: [{ id: "r1", profileId: "rep", role: "CHURCH_REP", churchId: "church-a", ministryId: null }],
};

function activity(partial: Partial<Activity> & Pick<Activity, "id">): Activity {
  const now = new Date("2026-10-30T01:00:00.000Z");
  return {
    title: "Event",
    description: null,
    location: null,
    isAllDay: false,
    scope: "LOCAL",
    visibility: "PUBLIC",
    churchId: "church-a",
    ministryId: null,
    hostChurchId: null,
    atOwnChurch: true,
    startAt: now,
    endAt: new Date("2026-10-30T02:00:00.000Z"),
    deleted: false,
    audience: null,
    createdBy: "rep",
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function mutation(partial: Partial<QueuedMutation> & Pick<QueuedMutation, "entityId">): QueuedMutation {
  return {
    op: "save",
    baseVersion: null,
    queuedAt: "2026-10-30T00:00:00.000Z",
    payload: {
      title: "Youth",
      isAllDay: false,
      startAt: "2026-10-30T09:00",
      endAt: "2026-10-30T10:00",
      scope: "LOCAL",
      actingRole: "CHURCH_REP",
    },
    ...partial,
  };
}

describe("SyncService.pull", () => {
  it("drops another church's private event even when the repository returns it", async () => {
    const listForPull = vi.fn(async () => [
      activity({ id: "public", title: "Sunday" }),
      activity({ id: "secret", title: "Private elders", visibility: "CHURCH_ONLY", churchId: "church-b" }),
      activity({ id: "ours", title: "Board", visibility: "CHURCH_ONLY", churchId: "church-a", deleted: true }),
    ]);
    const service = new SyncService(rep, { listForPull } as unknown as ActivityRepository, { save: vi.fn(), remove: vi.fn() });
    const page = await service.pull(null);
    expect(page.activities.map((row) => row.id)).toEqual(["public", "ours"]);
    expect(JSON.stringify(page)).not.toContain("Private elders");
  });
});

describe("SyncService.push", () => {
  const now = new Date("2026-10-30T00:00:00.000Z");

  it("does not apply a change queued longer than 30 days", async () => {
    const save = vi.fn();
    const service = new SyncService(rep, { findById: vi.fn() } as unknown as ActivityRepository, { save, remove: vi.fn() }, () => now);
    const [result] = await service.push([
      mutation({ entityId: "old", queuedAt: "2026-09-01T00:00:00.000Z" }),
    ]);
    expect(result.status).toBe("expired");
    expect(save).not.toHaveBeenCalled();
  });

  it("returns the server row when the version does not match", async () => {
    const server = activity({ id: "event", title: "Server title", version: 4 });
    const save = vi.fn(async () => {
      throw new AppError("VERSION", "This event changed. Reload it and try again.");
    });
    const service = new SyncService(
      rep,
      { findById: vi.fn(async () => server) } as unknown as ActivityRepository,
      { save, remove: vi.fn() },
      () => now
    );
    const [result] = await service.push([mutation({ entityId: "event", baseVersion: 2 })]);
    expect(result.status).toBe("conflict");
    expect(result.activity?.version).toBe(4);
    expect(result.activity?.title).toBe("Server title");
  });

  it("marks permission and validation failures and still syncs a different event", async () => {
    const save = vi.fn(async (input: { id?: string }) => {
      if (input.id === "denied") throw new AppError("FORBIDDEN", "You cannot edit this event.");
      return activity({ id: input.id ?? "new", title: "Kept" });
    });
    const service = new SyncService(rep, { findById: vi.fn() } as unknown as ActivityRepository, { save, remove: vi.fn() }, () => now);
    const results = await service.push([
      mutation({ entityId: "denied", clientId: 1 }),
      mutation({ entityId: "denied", clientId: 2, payload: { title: "Later", isAllDay: false, startAt: "2026-10-30T09:00", endAt: "2026-10-30T10:00", scope: "LOCAL", actingRole: "CHURCH_REP" } }),
      mutation({ entityId: "other", clientId: 3 }),
    ]);
    expect(results.find((row) => row.clientId === 1)?.status).toBe("failed");
    expect(results.find((row) => row.clientId === 2)?.status).toBe("failed");
    expect(results.find((row) => row.clientId === 3)?.status).toBe("ok");
    expect(save).toHaveBeenCalledTimes(2);
  });
});
