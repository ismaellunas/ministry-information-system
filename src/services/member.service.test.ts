import { describe, expect, it, vi } from "vitest";
import type { Profile } from "@/domain/types";
import { MemberService } from "./member.service";

const churchId = "8b4a6675-bf82-4e67-90d6-f1b69158fda5";

const actor: Profile = {
  id: "rep",
  firstName: "Jo",
  lastName: "Lunas",
  phoneNumber: null,
  isActive: true,
  mustChangePassword: false,
  isPastor: false,
  ncmdcId: "224",
  roles: [{ id: "r1", profileId: "rep", role: "CHURCH_REP", churchId, ministryId: null }],
};

const ministries = [
  { id: 1, code: "YA" as const, name: "Young Adults", tracksMembership: true, allowsChurchlessRep: false },
];

describe("MemberService.createMany", () => {
  it("inserts the valid new members in one write", async () => {
    const createMany = vi.fn(async () => []);
    const findManyByIds = vi.fn(async () => [{ id: "already-there" }]);
    const record = vi.fn(async () => undefined);
    const service = new MemberService(
      actor,
      { createMany, findManyByIds } as never,
      { listAll: async () => ministries } as never,
      { record } as never
    );

    const results = await service.createMany([
      { churchId, ministryId: 1, fullName: "ana cruz" },
      { churchId, ministryId: 1, fullName: " " },
      { id: "already-there", churchId, ministryId: 1, fullName: "Ben Santos" },
    ]);

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0]).toHaveLength(1);
    expect(createMany.mock.calls[0][0][0].fullName).toBe("Ana Cruz");
    expect(record).toHaveBeenCalledWith("rep", "member.create", "members", churchId, { count: 1 });
    expect(results.map((row) => row.status)).toEqual(["created", "failed", "created"]);
  });
});
