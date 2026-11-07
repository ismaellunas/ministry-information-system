// Birthday math — pure, zero framework imports.

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the month/day on which a birthday is celebrated.
 * Feb 29 → March 1 in a non-leap year (blueprint §8.3).
 */
export function celebrationDate(
  birthMonth: number,
  birthDay: number,
  year: number
): { month: number; day: number } {
  if (birthMonth === 2 && birthDay === 29 && !isLeapYear(year)) {
    return { month: 3, day: 1 };
  }
  return { month: birthMonth, day: birthDay };
}

/** Returns true if the birthday should be celebrated on the given Manila civil date. */
export function isBirthdayToday(
  birthMonth: number,
  birthDay: number,
  manilaYear: number,
  manilaMonth: number,
  manilaDay: number
): boolean {
  const { month, day } = celebrationDate(birthMonth, birthDay, manilaYear);
  return month === manilaMonth && day === manilaDay;
}

/**
 * Returns true if the given date (local time) is the first Sunday of the month.
 * First Sunday = Sunday (getDay() === 0) AND day-of-month is 1–7.
 */
export function isFirstSundayOfMonth(date: Date): boolean {
  return date.getDay() === 0 && date.getDate() >= 1 && date.getDate() <= 7;
}

/**
 * Picks the nearest birthday from a list already filtered to the current month:
 * the closest day on or after today, or the earliest day if none remain.
 */
export function daysInBirthMonth(month: number): number {
  if (month === 2) return 29;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

/** Pastor birthday rules. Year is stored, and is not part of a reminder. */
export function pastorBirthdayError(
  birthMonth: number | null,
  birthDay: number | null,
  birthYear: number | null,
  thisYear = new Date().getFullYear()
): string | null {
  if ((birthMonth == null) !== (birthDay == null)) {
    return "Enter both birth month and day, or leave both blank.";
  }
  if (birthYear != null && birthMonth == null) {
    return "Enter the birth month and day before the year.";
  }
  if (birthMonth != null && (birthMonth < 1 || birthMonth > 12)) {
    return "Enter a birth month from 1 to 12.";
  }
  if (birthMonth != null && birthDay != null && (birthDay < 1 || birthDay > daysInBirthMonth(birthMonth))) {
    return "Enter a real birth date.";
  }
  if (birthYear != null && (birthYear < 1900 || birthYear > thisYear)) {
    return `Enter a birth year from 1900 through ${thisYear}.`;
  }
  return null;
}

/** A reminder line for this month. The year is never included. */
export function pastorBirthdayReminder(
  pastor: { name: string | null; birthMonth: number | null; birthDay: number | null },
  month: number
): { id: string; fullName: string; birthMonth: number; birthDay: number } | null {
  if (pastor.birthMonth !== month || pastor.birthDay == null) return null;
  return {
    id: "pastor",
    fullName: pastor.name ? `Pastor ${pastor.name}` : "Pastor",
    birthMonth: pastor.birthMonth,
    birthDay: pastor.birthDay,
  };
}

export function nearestBirthdayThisMonth<T extends { birthDay: number }>(
  members: T[],
  todayDay: number
): T | null {
  if (members.length === 0) return null;
  const upcoming = members.filter((member) => member.birthDay >= todayDay);
  const pool = upcoming.length > 0 ? upcoming : members;
  return pool.reduce((nearest, member) => (member.birthDay < nearest.birthDay ? member : nearest));
}
