import { describe, expect, it, vi } from "vitest";
import type { Activity, Profile } from "@/domain/types";
import type { ActivityRepository, ActivityWrite } from "@/repositories/activity.repository";
import { ActivityService } from "./activity.service";
import type { ConflictService } from "./conflict.service";

const actor: Profile = {
  id: "admin",
  firstName: "Ada",
  lastName: "Admin",
  phoneNumber: null,
  isActive: true,
  mustChangePassword: false,
  roles: [{ id: "r1", profileId: "admin", role: "ADMIN", churchId: null, ministryId: null }],
};

function saved(write: ActivityWrite): Activity {
  return {
    ...write,
    deleted: false,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("ActivityService.save", () => {
  it("returns the saved event when clash notification throws", async () => {
    const activities = {
      findById: vi.fn(async () => null),
      insert: vi.fn(async (row: ActivityWrite) => saved(row)),
    } as unknown as ActivityRepository;
    const conflicts = {
      evaluateAndNotify: vi.fn(async () => {
        throw new Error("notify down");
      }),
    } as unknown as ConflictService;
    const audit = { record: vi.fn(async () => undefined) };
    const churches = {
      findById: vi.fn(async () => ({ id: "church-a", isActive: true, name: "GEWCI" })),
    };
    const service = new ActivityService(
      actor,
      activities,
      churches as never,
      { listAll: async () => [] } as never,
      { findById: async () => null } as never,
      conflicts,
      audit as never
    );
    const result = await service.save({
      title: "Sectional meeting",
      isAllDay: false,
      startAt: "2026-04-01T09:00",
      endAt: "2026-04-01T10:00",
      scope: "SECTIONAL",
      actingRole: "ADMIN",
    });
    expect(result.title).toBe("Sectional meeting");
    expect(audit.record).toHaveBeenCalled();
    expect(activities.insert).toHaveBeenCalledWith(expect.objectContaining({ scope: "SECTIONAL" }), "user");
  });

  it("saves an admin public local event with service access", async () => {
    const insert = vi.fn(async (row: ActivityWrite) => saved(row));
    const activities = {
      findById: vi.fn(async () => null),
      insert,
    } as unknown as ActivityRepository;
    const service = new ActivityService(
      actor,
      activities,
      { findById: async () => ({ id: "church-a", isActive: true, name: "GEWCI" }) } as never,
      { listAll: async () => [] } as never,
      { findById: async () => null } as never,
      { evaluateAndNotify: async () => undefined } as never,
      { record: async () => undefined } as never
    );
    await service.save({
      title: "Sunday service",
      isAllDay: false,
      startAt: "2026-04-01T15:00",
      endAt: "2026-04-01T16:00",
      scope: "LOCAL",
      churchId: "church-a",
      actingRole: "ADMIN",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "LOCAL", visibility: "PUBLIC", churchId: "church-a" }),
      "service"
    );
  });

  it("inserts a client UUID when the row does not exist yet", async () => {
    const insert = vi.fn(async (row: ActivityWrite) => saved(row));
    const activities = {
      findById: vi.fn(async () => null),
      insert,
    } as unknown as ActivityRepository;
    const service = new ActivityService(
      actor,
      activities,
      { findById: async () => ({ id: "church-a", isActive: true, name: "GEWCI" }) } as never,
      { listAll: async () => [] } as never,
      { findById: async () => null } as never,
      { evaluateAndNotify: async () => undefined } as never,
      { record: async () => undefined } as never
    );
    const id = "8102f140-ad20-4614-aa10-6cf1bdcd29bc";
    await service.save({
      id,
      title: "Private elders",
      isAllDay: false,
      startAt: "2026-10-30T09:15",
      endAt: "2026-10-30T09:45",
      scope: "SECTIONAL",
      actingRole: "ADMIN",
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ id }), "user");
  });
});
