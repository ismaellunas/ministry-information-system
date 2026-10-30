import { describe, expect, it } from "vitest";
import { sanitizeAuditDetail } from "./audit";

describe("sanitizeAuditDetail", () => {
  it("allows counts and role names", () => {
    expect(
      sanitizeAuditDetail({
        role: "CHURCH_REP",
        ministryId: 1,
        memberCount: 40,
        rosterComplete: false,
      })
    ).toMatchObject({ memberCount: 40 });
  });

  it("allows a church name", () => {
    expect(sanitizeAuditDetail({ name: "Great Emmanuel" })).toMatchObject({
      name: "Great Emmanuel",
    });
  });

  it("rejects member names and phones", () => {
    expect(() => sanitizeAuditDetail({ fullName: "Ada" })).toThrow(/fullName/);
    expect(() => sanitizeAuditDetail({ phoneNumber: "0917" })).toThrow(/phoneNumber/);
    expect(() => sanitizeAuditDetail({ birth_day: 1 })).toThrow(/birth_day/);
  });
});
