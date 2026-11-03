import "server-only";

import { allDayRangeBounds, todayManila } from "@/domain/time";

/** [today, end of this month] in Manila, as UTC bounds for activities.list(). */
export function thisMonthRange(): { start: Date; end: Date } {
  const today = todayManila();
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const endCivil = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return allDayRangeBounds(today, endCivil);
}
