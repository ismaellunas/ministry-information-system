// Manila civil-date helpers — pure, zero framework imports.
import { toZonedTime, fromZonedTime, format as tzFormat } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";

export const MANILA_TZ = "Asia/Manila";

/** Convert a Manila wall-clock Date to UTC. */
export function manilaToUtc(manilaDate: Date): Date {
  return fromZonedTime(manilaDate, MANILA_TZ);
}

/** Convert a UTC Date to Manila wall-clock Date. */
export function utcToManila(utcDate: Date): Date {
  return toZonedTime(utcDate, MANILA_TZ);
}

/**
 * All-day single date: returns half-open [start, end) UTC bounds.
 * start = 00:00 Manila on that date; end = 00:00 Manila the next day.
 */
export function allDayBounds(civilDate: string): { start: Date; end: Date } {
  const [year, month, day] = civilDate.split("-").map(Number);
  const start = fromZonedTime(
    new Date(year, month - 1, day, 0, 0, 0, 0),
    MANILA_TZ
  );
  const manilaStart = toZonedTime(start, MANILA_TZ);
  const end = fromZonedTime(addDays(startOfDay(manilaStart), 1), MANILA_TZ);
  return { start, end };
}

/**
 * All-day range: end bound is the start of the day AFTER endDate in Manila.
 */
export function allDayRangeBounds(
  startDate: string,
  endDate: string
): { start: Date; end: Date } {
  const { start } = allDayBounds(startDate);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const manilaEnd = toZonedTime(
    fromZonedTime(new Date(ey, em - 1, ed, 0, 0, 0, 0), MANILA_TZ),
    MANILA_TZ
  );
  const end = fromZonedTime(addDays(startOfDay(manilaEnd), 1), MANILA_TZ);
  return { start, end };
}

/** Today's civil date in Manila as "YYYY-MM-DD". */
export function todayManila(): string {
  return tzFormat(toZonedTime(new Date(), MANILA_TZ), "yyyy-MM-dd", {
    timeZone: MANILA_TZ,
  });
}
