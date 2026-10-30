"use client";

import Link from "next/link";
import { format, startOfWeek } from "date-fns";
import { manilaWallDate, todayManila } from "@/domain/time";
import type { CalendarItem } from "./CalendarBoard";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PhoneMonth({
  cursor,
  events,
  onOpenDay,
}: {
  cursor: Date;
  events: CalendarItem[];
  onOpenDay: (day: Date) => void;
}) {
  const today = todayManila();
  const weeks = monthWeeks(cursor);
  const month = cursor.getMonth();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-xs">
      <div className="grid shrink-0 grid-cols-7 pb-1 text-center text-xs font-medium text-gray-500">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {weeks.map((week) => {
          const rows = eventsInWeek(week, events);
          return (
            <div key={format(week[0], "yyyy-MM-dd")} className={rows.length > 0 ? "shrink-0" : "flex min-h-11 flex-1 flex-col"}>
              <div className={`grid grid-cols-7 ${rows.length === 0 ? "h-full flex-1" : ""}`}>
                {week.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const inMonth = day.getMonth() === month;
                  const isToday = key === today;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onOpenDay(day)}
                      className={`flex h-full min-h-11 items-center justify-center rounded-lg text-sm font-medium ${
                        isToday
                          ? "bg-brand-50 text-brand-500"
                          : inMonth
                            ? "text-gray-900"
                            : "text-gray-400"
                      }`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
              {rows.length > 0 && (
                <div className="space-y-1 px-1 pb-2">
                  {rows.map((item) => (
                    <Link
                      key={item.id}
                      href={`/calendar/${item.id}`}
                      className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${eventClass(item)}`}
                    >
                      {eventLabel(item)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function monthWeeks(cursor: Date): Date[][] {
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const day = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1), { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  while (day <= last && weeks.length < 6) {
    const week: Date[] = [];
    for (let index = 0; index < 7; index += 1) {
      week.push(new Date(day));
      day.setDate(day.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function eventsInWeek(week: Date[], events: CalendarItem[]): CalendarItem[] {
  const days = new Set(week.map((day) => format(day, "yyyy-MM-dd")));
  return events
    .filter((item) => eventDays(item).some((day) => days.has(day)))
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());
}

function eventDays(item: CalendarItem): string[] {
  const start = manilaWallDate(new Date(item.start));
  if (!item.allDay) return [format(start, "yyyy-MM-dd")];
  const end = manilaWallDate(new Date(item.end));
  const days: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor < last) {
    days.push(format(cursor, "yyyy-MM-dd"));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (days.length === 0) days.push(format(start, "yyyy-MM-dd"));
  return days;
}

function eventLabel(item: CalendarItem) {
  const start = manilaWallDate(new Date(item.start));
  const when = item.allDay ? format(start, "d") : format(start, "d · h:mm a");
  return `${when} ${item.title}`;
}

function eventClass(item: CalendarItem) {
  if (item.clash) return "bg-[#fb2c36] text-white";
  if (item.scope === "SECTIONAL" && item.ministryId) return "bg-[#252dae] text-white";
  if (item.scope === "SECTIONAL") return "bg-brand-500 text-white";
  if (item.ownChurch) return "bg-[#12b76a] text-white";
  return "bg-[#9cb9ff] text-[#101828]";
}
