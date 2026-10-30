"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { ChevronDown, Plus } from "lucide-react";
import { manilaWallDate, todayManila } from "@/domain/time";
import type { UserRole } from "@/domain/types";
import { EventForm, type EventFormValues } from "./EventForm";
import { searchableText } from "@/domain/search";
import { Button } from "@/core/ui/button";
import { Label } from "@/core/ui/label";
import { Select } from "@/core/ui/select";
import { SearchableList } from "@/core/ui/searchable-list";
import { PhoneMonth } from "./PhoneMonth";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../calendar.css";

export interface CalendarItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  scope: "LOCAL" | "SECTIONAL";
  ministryId: number | null;
  churchId: string | null;
  churchName: string | null;
  ministryName: string | null;
  location: string | null;
  ownChurch: boolean;
  clash: boolean;
  clashMessage: string | null;
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { "en-US": enUS },
});

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "agenda", label: "Agenda" },
];

export interface AddEventContext {
  roles: UserRole[];
  homeChurchId: string | null;
  repChurchIds: string[];
  ownMinistryId: number | null;
  churches: Array<{ id: string; name: string; isActive: boolean }>;
  ministries: Array<{ id: number; name: string }>;
}

export function CalendarBoard({
  items,
  churches,
  ministries,
  from,
  canAdd,
  addEvent,
}: {
  items: CalendarItem[];
  churches: Array<{ id: string; name: string }>;
  ministries: Array<{ id: number; name: string }>;
  from: string;
  canAdd: boolean;
  addEvent: AddEventContext | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<EventFormValues | null>(null);
  const [view, setView] = useState<View>("month");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null);
  const [scope, setScope] = useState("all");
  const [churchId, setChurchId] = useState("all");
  const [ministryId, setMinistryId] = useState("all");
  const [clashesOnly, setClashesOnly] = useState(false);
  const [shown, setShown] = useState(items);
  const onFiltered = useCallback((next: CalendarItem[]) => {
    setShown((current) =>
      current.length === next.length && current.every((item, index) => item.id === next[index]?.id && item.clashMessage === next[index]?.clashMessage)
        ? current
        : next
    );
  }, []);
  const [year, month, day] = from.split("-").map(Number);
  const cursor = new Date(year, month - 1, day);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (scope === "local" && item.scope !== "LOCAL") return false;
        if (scope === "sectional" && item.scope !== "SECTIONAL") return false;
        if (churchId !== "all" && item.churchId !== churchId) return false;
        if (ministryId !== "all" && String(item.ministryId ?? "") !== ministryId) return false;
        if (clashesOnly && !item.clash) return false;
        return true;
      }),
    [churchId, clashesOnly, items, ministryId, scope]
  );

  const activeFilters = [scope !== "all", churchId !== "all", ministryId !== "all", clashesOnly].filter(Boolean).length;

  function chooseView(next: View) {
    setView(next);
    if (next === "agenda") setFiltersOpen(true);
  }

  const gridEvents = (view === "agenda" ? filtered : shown).map((item) => ({
    id: item.id,
    title: item.clash ? `${item.title} · clash` : item.title,
    start: manilaWallDate(new Date(item.start)),
    end: manilaWallDate(new Date(item.end)),
    allDay: item.allDay,
    resource: item,
  }));

  function openDay(day: Date) {
    setView("day");
    router.replace(`/calendar?from=${format(day, "yyyy-MM-dd")}`);
  }

  if (draft && addEvent) {
    return (
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        <button type="button" className="min-h-11 text-sm font-medium text-brand-500" onClick={() => setDraft(null)}>
          Calendar
        </button>
        <h2 className="page-title">Add event</h2>
        <EventForm
          values={draft}
          roles={addEvent.roles}
          homeChurchId={addEvent.homeChurchId}
          repChurchIds={addEvent.repChurchIds}
          ownMinistryId={addEvent.ownMinistryId}
          churches={addEvent.churches}
          ministries={addEvent.ministries}
          onDone={() => setDraft(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 md:block md:flex-none md:space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => chooseView(item.id)}
            className={`min-h-11 rounded-lg border px-2 text-sm font-medium ${
              view === item.id ? "border-brand-500 bg-brand-50 text-brand-500" : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <details
        className="group rounded-2xl border border-gray-200 bg-white shadow-theme-xs"
        open={filtersOpen}
        onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
          <span>{activeFilters > 0 ? `Filters · ${activeFilters}` : "Filters"}</span>
          <ChevronDown className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-gray-200 px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="filter-scope">Scope</Label>
              <Select id="filter-scope" value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="all">All scopes</option>
                <option value="local">Local</option>
                <option value="sectional">Sectional</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-church">Church</Label>
              <Select id="filter-church" value={churchId} onChange={(event) => setChurchId(event.target.value)}>
                <option value="all">All churches</option>
                {churches.map((church) => (
                  <option key={church.id} value={church.id}>{church.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-ministry">Ministry</Label>
              <Select id="filter-ministry" value={ministryId} onChange={(event) => setMinistryId(event.target.value)}>
                <option value="all">All ministries</option>
                {ministries.map((ministry) => (
                  <option key={ministry.id} value={ministry.id}>{ministry.name}</option>
                ))}
              </Select>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm text-gray-800 sm:mt-6">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={clashesOnly}
                onChange={(event) => setClashesOnly(event.target.checked)}
              />
              Clashes only
            </label>
          </div>
          <div ref={setSearchSlot} />
          <p className="page-copy">
            Blue is sectional, dark blue is a ministry event, green is your church, and pale blue is another church. Red is an open clash.
          </p>
        </div>
      </details>

      {view === "agenda" && <MonthName cursor={cursor} />}

      <div className={view === "agenda" ? "min-h-0 flex-1 overflow-y-auto" : undefined}>
        <SearchableList
          items={filtered}
          itemKey={(item) => item.id}
          getSearchText={(item) =>
            searchableText([item.title, item.churchName, item.ministryName, item.location, item.clashMessage])
          }
          placeholder="Title, church, ministry, or place"
          noneYet="No events in this stretch of the calendar."
          noneFound={(query) => `No events match “${query}”.`}
          hideRows={view !== "agenda"}
          onFiltered={onFiltered}
          searchSlot={searchSlot}
        >
          {(item) => <EventCard item={item} />}
        </SearchableList>
      </div>

      {view === "agenda" && <CalendarNav canAdd={canAdd} onAdd={() => addEvent && setDraft(blankEvent(addEvent))} onPrevious={() => move(router, from, view, -1)} onNext={() => move(router, from, view, 1)} />}

      {view === "month" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 md:hidden">
          <MonthName cursor={cursor} />
          <PhoneMonth cursor={cursor} events={shown} onOpenDay={openDay} />
          <CalendarNav canAdd={canAdd} onAdd={() => addEvent && setDraft(blankEvent(addEvent))} onPrevious={() => move(router, from, view, -1)} onNext={() => move(router, from, view, 1)} />
        </div>
      )}

      {view !== "agenda" && (
        <div className={`west-calendar min-h-0 flex-1 flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-xs ${view === "month" ? "hidden md:flex" : "flex"}`}>
          <MonthName cursor={cursor} />
          <div className="min-h-0 flex-1 md:h-[40rem] md:flex-none">
            <Calendar
              localizer={localizer}
              events={gridEvents}
              date={cursor}
              view={view}
              onView={chooseView}
              views={["month", "week", "day"]}
              toolbar={false}
              showAllEvents
              onNavigate={(next) => {
                const stamp = format(next, "yyyy-MM-dd");
                router.replace(`/calendar?from=${stamp}`);
              }}
              onSelectEvent={(event) => router.push(`/calendar/${event.resource.id}`)}
              eventPropGetter={(event) => ({ className: tone(event.resource) })}
              style={{ height: "100%" }}
            />
          </div>
          <CalendarNav canAdd={canAdd} onAdd={() => addEvent && setDraft(blankEvent(addEvent))} onPrevious={() => move(router, from, view, -1)} onNext={() => move(router, from, view, 1)} />
        </div>
      )}
    </div>
  );
}

function blankEvent(seed: AddEventContext): EventFormValues {
  const today = todayManila();
  const role = seed.roles[0];
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    location: "",
    isAllDay: false,
    startAt: `${today}T09:00`,
    endAt: `${today}T10:00`,
    scope: role === "SECTION_MINISTRY_REP" ? "SECTIONAL" : "LOCAL",
    visibility: "PUBLIC",
    churchId: seed.homeChurchId ?? "",
    ministryId: seed.ownMinistryId ? String(seed.ownMinistryId) : "",
    hostChurchId: "",
    atOwnChurch: true,
    audience: "",
    actingRole: role,
  };
}

export function EventCard({ item }: { item: CalendarItem }) {
  return (
    <Link href={`/calendar/${item.id}`} className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
      <p className={`text-sm font-semibold ${item.clash ? "text-conflict" : "text-gray-900"}`}>{item.title}</p>
      <p className="page-copy">{when(item)}</p>
      {item.churchName && <p className="page-copy">{item.churchName}</p>}
      {item.ministryName && <p className="page-copy">{item.ministryName}</p>}
      {item.location && <p className="page-copy">{item.location}</p>}
      {item.clashMessage && <p className="page-copy text-conflict">{item.clashMessage}</p>}
    </Link>
  );
}

function MonthName({ cursor }: { cursor: Date }) {
  return <h2 className="shrink-0 text-center text-base font-semibold text-gray-900">{format(cursor, "MMMM yyyy")}</h2>;
}

function CalendarNav({
  canAdd,
  onAdd,
  onPrevious,
  onNext,
}: {
  canAdd: boolean;
  onAdd: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className={`grid shrink-0 items-center gap-2 ${canAdd ? "grid-cols-[1fr_2.75rem_1fr]" : "grid-cols-2"}`}>
      <Button type="button" variant="outline" onClick={onPrevious}>Previous</Button>
      {canAdd && (
        <Button asChild size="icon">
          <Link
            href="/calendar/new"
            aria-label="Add event"
            onClick={(event) => {
              if (navigator.onLine) return;
              event.preventDefault();
              onAdd();
            }}
          >
            <Plus className="h-5 w-5" />
          </Link>
        </Button>
      )}
      <Button type="button" variant="outline" onClick={onNext}>Next</Button>
    </div>
  );
}

function when(item: CalendarItem) {
  const start = manilaWallDate(new Date(item.start));
  const end = manilaWallDate(new Date(item.end));
  if (item.allDay) return format(start, "MMM d, yyyy");
  return `${format(start, "MMM d, h:mm a")} – ${format(end, "MMM d, h:mm a")}`;
}

function tone(item: CalendarItem) {
  if (item.clash) return "event-clash";
  if (item.scope === "SECTIONAL" && item.ministryId) return "event-ministry";
  if (item.scope === "SECTIONAL") return "event-sectional";
  if (item.ownChurch) return "event-own";
  return "event-public";
}

function move(router: ReturnType<typeof useRouter>, from: string, view: View, direction: number) {
  const [year, month, day] = from.split("-").map(Number);
  const cursor = new Date(year, month - 1, day);
  if (view === "month") cursor.setMonth(cursor.getMonth() + direction);
  else if (view === "week") cursor.setDate(cursor.getDate() + direction * 7);
  else cursor.setDate(cursor.getDate() + direction);
  router.replace(`/calendar?from=${format(cursor, "yyyy-MM-dd")}`);
}
