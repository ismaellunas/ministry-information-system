import { AppError } from "./errors";
import { allDayRangeBounds, manilaToUtc } from "./time";

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Timed input is Manila wall time unless it already has a timezone. */
export function resolveActivityBounds(input: {
  isAllDay: boolean;
  startAt: string;
  endAt: string;
}): { start: Date; end: Date } {
  if (input.isAllDay) {
    if (!CIVIL_DATE.test(input.startAt) || !CIVIL_DATE.test(input.endAt)) {
      throw new AppError("VALIDATION", "All-day events use a start date and an end date.");
    }
    if (input.endAt < input.startAt) {
      throw new AppError("VALIDATION", "The end date must be on or after the start date.");
    }
    return allDayRangeBounds(input.startAt, input.endAt);
  }

  const start = parseManilaInput(input.startAt);
  const end = parseManilaInput(input.endAt);
  if (!(end > start)) {
    throw new AppError("VALIDATION", "The end time must be after the start time.");
  }
  return { start, end };
}

function parseManilaInput(value: string): Date {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new AppError("VALIDATION", "Enter a valid time.");
    return date;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) throw new AppError("VALIDATION", "Enter a valid time.");
  return manilaToUtc(
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0, 0)
  );
}
