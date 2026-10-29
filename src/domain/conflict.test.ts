import { describe, it, expect } from "vitest";
import { classify, overlaps } from "./conflict";
import type { ActivityLike } from "./types";

function act(overrides: Partial<ActivityLike> & { id: string }): ActivityLike {
  return {
    scope: "LOCAL",
    visibility: "PUBLIC",
    churchId: "church-a",
    ministryId: null,
    hostChurchId: null,
    atOwnChurch: true,
    startAt: new Date("2025-01-01T08:00:00Z"),
    endAt: new Date("2025-01-01T12:00:00Z"),
    deleted: false,
    ...overrides,
  };
}

describe("overlaps", () => {
  it("true for overlapping events", () => {
    const a = act({ id: "1", startAt: new Date("2025-01-01T08:00:00Z"), endAt: new Date("2025-01-01T12:00:00Z") });
    const b = act({ id: "2", startAt: new Date("2025-01-01T10:00:00Z"), endAt: new Date("2025-01-01T14:00:00Z") });
    expect(overlaps(a, b)).toBe(true);
  });

  it("false for touching endpoints (half-open)", () => {
    const a = act({ id: "1", endAt: new Date("2025-01-01T12:00:00Z") });
    const b = act({ id: "2", startAt: new Date("2025-01-01T12:00:00Z"), endAt: new Date("2025-01-01T16:00:00Z") });
    expect(overlaps(a, b)).toBe(false);
  });

  it("false for non-overlapping", () => {
    const a = act({ id: "1", endAt: new Date("2025-01-01T10:00:00Z") });
    const b = act({ id: "2", startAt: new Date("2025-01-01T12:00:00Z"), endAt: new Date("2025-01-01T14:00:00Z") });
    expect(overlaps(a, b)).toBe(false);
  });
});

describe("classify — §8.1 matrix", () => {
  it("same-church LOCAL vs LOCAL → CONFLICT", () => {
    expect(classify(act({ id: "1" }), act({ id: "2" }))).toBe("CONFLICT");
  });

  it("different-church LOCAL vs LOCAL → NONE", () => {
    expect(classify(act({ id: "1", churchId: "a" }), act({ id: "2", churchId: "b" }))).toBe("NONE");
  });

  it("SECTIONAL vs SECTIONAL → CONFLICT", () => {
    const a = act({ id: "1", scope: "SECTIONAL", churchId: null });
    const b = act({ id: "2", scope: "SECTIONAL", churchId: null });
    expect(classify(a, b)).toBe("CONFLICT");
  });

  it("PUBLIC local vs ministry sectional → CONFLICT", () => {
    const local = act({ id: "1", visibility: "PUBLIC" });
    const sec = act({ id: "2", scope: "SECTIONAL", churchId: null, ministryId: 1 });
    expect(classify(local, sec)).toBe("CONFLICT");
  });

  it("PUBLIC local vs general sectional (different place) → NONE", () => {
    const local = act({ id: "1", visibility: "PUBLIC", atOwnChurch: true });
    const sec = act({ id: "2", scope: "SECTIONAL", churchId: null, ministryId: null, hostChurchId: null });
    expect(classify(local, sec)).toBe("NONE");
  });

  it("PUBLIC local at church-a vs general sectional hosted at church-a → CONFLICT (same location)", () => {
    const local = act({ id: "1", churchId: "church-a", atOwnChurch: true });
    const sec = act({ id: "2", scope: "SECTIONAL", churchId: null, ministryId: null, hostChurchId: "church-a" });
    expect(classify(local, sec)).toBe("CONFLICT");
  });

  it("CHURCH_ONLY local vs sectional NOT at that church → NONE", () => {
    const local = act({ id: "1", visibility: "CHURCH_ONLY", atOwnChurch: true });
    const sec = act({ id: "2", scope: "SECTIONAL", churchId: null, ministryId: 1, hostChurchId: null });
    expect(classify(local, sec)).toBe("NONE");
  });

  it("CHURCH_ONLY local at church-a vs sectional hosted at church-a → CONFLICT (same location)", () => {
    const local = act({ id: "1", visibility: "CHURCH_ONLY", churchId: "church-a", atOwnChurch: true });
    const sec = act({ id: "2", scope: "SECTIONAL", churchId: null, hostChurchId: "church-a" });
    expect(classify(local, sec)).toBe("CONFLICT");
  });

  it("same id → NONE", () => {
    const a = act({ id: "1" });
    expect(classify(a, a)).toBe("NONE");
  });

  it("deleted event → NONE", () => {
    const a = act({ id: "1", deleted: true });
    expect(classify(a, act({ id: "2" }))).toBe("NONE");
  });
});
