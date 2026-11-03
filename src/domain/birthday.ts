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
export function nearestBirthdayThisMonth<T extends { birthDay: number }>(
  members: T[],
  todayDay: number
): T | null {
  if (members.length === 0) return null;
  const upcoming = members.filter((member) => member.birthDay >= todayDay);
  const pool = upcoming.length > 0 ? upcoming : members;
  return pool.reduce((nearest, member) => (member.birthDay < nearest.birthDay ? member : nearest));
}
