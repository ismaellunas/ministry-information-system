"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listStoredActivities, pendingEntityIds, rememberSeen } from "@/composition/browser";
import { allDayRangeBounds } from "@/domain/time";
import type { ActivityWire } from "@/domain/sync";
import { CalendarBoard, type AddEventContext, type CalendarItem } from "./CalendarBoard";

/** The server fetches from-7 days to from+42 days. Mirror that window for offline navigation. */
function windowFor(civil: string): { start: Date; end: Date } {
  const [year, month, day] = civil.split("-").map(Number);
  const base = new Date(year, month - 1, day);
  const shift = (days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return allDayRangeBounds(shift(-7), shift(42));
}

const CIVIL = /^\d{4}-\d{2}-\d{2}$/;

export function LocalCalendar({
  initialItems,
  churches,
  ministries,
  from: serverFrom,
  canAdd,
  homeChurchId,
  hideChurchOnly,
  addEvent,
}: {
  initialItems: CalendarItem[];
  churches: Array<{ id: string; name: string }>;
  ministries: Array<{ id: number; name: string }>;
  from: string;
  canAdd: boolean;
  homeChurchId: string | null;
  hideChurchOnly: boolean;
  addEvent: AddEventContext | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get("from") ?? serverFrom;
  const initialFrom = CIVIL.test(rawFrom) ? rawFrom : serverFrom;
  const [from, setFrom] = useState(initialFrom);

  useEffect(() => {
    const urlFrom = searchParams.get("from");
    if (urlFrom && CIVIL.test(urlFrom) && urlFrom !== from) {
      setFrom(urlFrom);
    }
  }, [searchParams, from]);

  const handleNavigate = useCallback(
    (nextFrom: string) => {
      if (nextFrom === from) return;
      setFrom(nextFrom);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/calendar?from=${nextFrom}`);
      }
      if (typeof navigator !== "undefined" && navigator.onLine) {
        router.replace(`/calendar?from=${nextFrom}`);
      }
    },
    [from, router]
  );

  const [items, setItems] = useState(initialItems);
  const signature = initialItems.map((item) => `${item.id}:${item.start}:${item.clashMessage ?? ""}`).join("|");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await rememberSeen(
        initialItems.map((item) => ({
          id: item.id,
          title: item.title,
          startAt: item.start,
          endAt: item.end,
          isAllDay: item.allDay,
          scope: item.scope,
          ministryId: item.ministryId,
          churchId: item.churchId,
          location: item.location,
        }))
      );
      const [stored, pending] = await Promise.all([listStoredActivities(), pendingEntityIds()]);
      if (cancelled) return;

      // When the user has navigated to a different month/week while offline,
      // the server cannot re-render. Filter the locally stored events to the
      // same [-7, +42] window the server would have used for that `from` date.
      const isOfflineNavigation = from !== serverFrom;
      const storedForWindow = isOfflineNavigation
        ? stored.filter((row) => {
            // Always pass tombstones through so mergeItems can remove them.
            if (row.deleted) return true;
            const win = windowFor(from);
            const rowStart = new Date(row.startAt).getTime();
            const rowEnd = new Date(row.endAt).getTime();
            return rowStart < win.end.getTime() && rowEnd > win.start.getTime();
          })
        : stored;

      setItems(mergeItems(initialItems, storedForWindow, new Set(pending), churches, ministries, homeChurchId, hideChurchOnly, isOfflineNavigation));
    }
    void load();
    const onSync = () => void load();
    window.addEventListener("west-mis-sync", onSync);
    return () => {
      cancelled = true;
      window.removeEventListener("west-mis-sync", onSync);
    };
    // The signature is the server list. churches and ministries come from the same render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, from, serverFrom, hideChurchOnly, homeChurchId]);

  return (
    <CalendarBoard
      items={items}
      churches={churches}
      ministries={ministries}
      from={from}
      canAdd={canAdd}
      addEvent={addEvent}
      onNavigate={handleNavigate}
    />
  );
}

function mergeItems(
  serverItems: CalendarItem[],
  stored: ActivityWire[],
  pending: Set<string>,
  churches: Array<{ id: string; name: string }>,
  ministries: Array<{ id: number; name: string }>,
  homeChurchId: string | null,
  hideChurchOnly: boolean,
  /** When true (offline navigation), build the list entirely from Dexie — server items are for a different date. */
  fromStoredOnly = false
): CalendarItem[] {
  const churchName = new Map(churches.map((church) => [church.id, church.name]));
  const ministryName = new Map(ministries.map((ministry) => [ministry.id, ministry.name]));

  // When navigating offline, start with an empty map so we don't show server
  // items that belong to a different date window.
  const byId = fromStoredOnly
    ? new Map<string, CalendarItem>()
    : new Map(serverItems.map((item) => [item.id, item]));

  for (const row of stored) {
    if (hideChurchOnly && row.visibility === "CHURCH_ONLY") continue;
    if (row.deleted) {
      byId.delete(row.id);
      continue;
    }
    const waiting = pending.has(row.id);
    // When merging against the server list (online), skip rows that are
    // already up-to-date on the server and not pending.
    if (!fromStoredOnly && !waiting && byId.has(row.id)) continue;
    const churchId = row.churchId ?? row.hostChurchId;
    byId.set(row.id, {
      id: row.id,
      title: waiting ? `${row.title} · on this phone` : row.title,
      start: row.startAt,
      end: row.endAt,
      allDay: row.isAllDay,
      scope: row.scope,
      ministryId: row.ministryId,
      churchId,
      churchName: churchId ? churchName.get(churchId) ?? null : null,
      ministryName: row.ministryId ? ministryName.get(row.ministryId) ?? null : null,
      location: row.location,
      ownChurch: row.churchId != null && row.churchId === homeChurchId,
      clash: false,
      clashMessage: null,
    });
  }
  return Array.from(byId.values());
}
