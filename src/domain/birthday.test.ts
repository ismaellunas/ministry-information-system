import { describe, it, expect } from "vitest";
import { celebrationDate, isBirthdayToday, isFirstSundayOfMonth } from "./birthday";

describe("celebrationDate", () => {
  it("Feb 29 in leap year stays Feb 29", () => {
    expect(celebrationDate(2, 29, 2024)).toEqual({ month: 2, day: 29 });
  });
  it("Feb 29 in non-leap year → March 1", () => {
    expect(celebrationDate(2, 29, 2025)).toEqual({ month: 3, day: 1 });
  });
  it("other dates pass through", () => {
    expect(celebrationDate(3, 15, 2025)).toEqual({ month: 3, day: 15 });
  });
});

describe("isBirthdayToday", () => {
  it("matches normal birthday", () => {
    expect(isBirthdayToday(5, 10, 2025, 5, 10)).toBe(true);
  });
  it("Feb 29 celebrated March 1 in non-leap year", () => {
    expect(isBirthdayToday(2, 29, 2025, 3, 1)).toBe(true);
  });
  it("does not match wrong date", () => {
    expect(isBirthdayToday(5, 10, 2025, 5, 11)).toBe(false);
  });
});

describe("isFirstSundayOfMonth", () => {
  it("Jan 5 2025 (Sunday, day 5) → true", () => {
    expect(isFirstSundayOfMonth(new Date("2025-01-05T00:00:00"))).toBe(true);
  });
  it("Jan 12 2025 (Sunday, day 12) → false", () => {
    expect(isFirstSundayOfMonth(new Date("2025-01-12T00:00:00"))).toBe(false);
  });
  it("Monday → false", () => {
    expect(isFirstSundayOfMonth(new Date("2025-01-06T00:00:00"))).toBe(false);
  });
});
