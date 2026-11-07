import { describe, it, expect } from "vitest";
import {
  celebrationDate,
  isBirthdayToday,
  isFirstSundayOfMonth,
  nearestBirthdayThisMonth,
  pastorBirthdayError,
  pastorBirthdayReminder,
} from "./birthday";

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

describe("pastor birthday", () => {
  it("requires month and day together", () => {
    expect(pastorBirthdayError(5, null, null)).toBe("Enter both birth month and day, or leave both blank.");
    expect(pastorBirthdayError(null, null, null)).toBeNull();
  });

  it("keeps the year only with a month and day", () => {
    expect(pastorBirthdayError(null, null, 1970)).toMatch(/month and day/);
    expect(pastorBirthdayError(5, 18, 1970)).toBeNull();
  });

  it("rejects a day that month does not have", () => {
    expect(pastorBirthdayError(4, 31, 1970)).toBe("Enter a real birth date.");
  });

  it("builds a reminder without the year", () => {
    expect(
      pastorBirthdayReminder({ name: "Juan Cruz", birthMonth: 5, birthDay: 18 }, 5)
    ).toEqual({
      id: "pastor",
      fullName: "Pastor Juan Cruz",
      birthMonth: 5,
      birthDay: 18,
    });
    expect(pastorBirthdayReminder({ name: "Juan Cruz", birthMonth: 5, birthDay: 18 }, 6)).toBeNull();
  });
});

describe("nearestBirthdayThisMonth", () => {
  it("picks the closest day on or after today", () => {
    const members = [{ birthDay: 3 }, { birthDay: 18 }, { birthDay: 25 }];
    expect(nearestBirthdayThisMonth(members, 10)).toEqual({ birthDay: 18 });
  });
  it("wraps to the earliest day when none remain this month", () => {
    const members = [{ birthDay: 3 }, { birthDay: 18 }];
    expect(nearestBirthdayThisMonth(members, 20)).toEqual({ birthDay: 3 });
  });
  it("returns null for an empty list", () => {
    expect(nearestBirthdayThisMonth([], 10)).toBeNull();
  });
});
