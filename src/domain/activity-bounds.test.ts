import { describe, expect, it } from "vitest";
import { resolveActivityBounds } from "./activity-bounds";

describe("resolveActivityBounds", () => {
  it("sets all-day bounds in Manila and ignores the phone zone", () => {
    const bounds = resolveActivityBounds({
      isAllDay: true,
      startAt: "2026-01-01",
      endAt: "2026-01-01",
    });
    expect(bounds.start.toISOString()).toBe("2025-12-31T16:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-01-01T16:00:00.000Z");
  });

  it("converts a Manila wall time to UTC", () => {
    const bounds = resolveActivityBounds({
      isAllDay: false,
      startAt: "2026-03-01T14:00",
      endAt: "2026-03-01T15:00",
    });
    expect(bounds.start.toISOString()).toBe("2026-03-01T06:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-03-01T07:00:00.000Z");
  });

  it("rejects an end that is not after the start", () => {
    expect(() =>
      resolveActivityBounds({ isAllDay: false, startAt: "2026-03-01T15:00", endAt: "2026-03-01T14:00" })
    ).toThrow(/after the start/);
  });
});
