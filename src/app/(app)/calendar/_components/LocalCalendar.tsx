"use client";

import { useEffect, useState } from "react";
import { listStoredActivities, pendingEntityIds, rememberSeen } from "@/composition/browser";
import type { ActivityWire } from "@/domain/sync";
import { CalendarBoard, type AddEventContext, type CalendarItem } from "./CalendarBoard";

export function LocalCalendar({
  initialItems,
  churches,
  ministries,
  from,
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
      setItems(mergeItems(initialItems, stored, new Set(pending), churches, ministries, homeChurchId, hideChurchOnly));
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
  }, [signature, from, hideChurchOnly, homeChurchId]);

  return (
    <CalendarBoard items={items} churches={churches} ministries={ministries} from={from} canAdd={canAdd} addEvent={addEvent} />
  );
}

function mergeItems(
  serverItems: CalendarItem[],
  stored: ActivityWire[],
  pending: Set<string>,
  churches: Array<{ id: string; name: string }>,
  ministries: Array<{ id: number; name: string }>,
  homeChurchId: string | null,
  hideChurchOnly: boolean
): CalendarItem[] {
  const churchName = new Map(churches.map((church) => [church.id, church.name]));
  const ministryName = new Map(ministries.map((ministry) => [ministry.id, ministry.name]));
  const byId = new Map(serverItems.map((item) => [item.id, item]));
  for (const row of stored) {
    if (hideChurchOnly && row.visibility === "CHURCH_ONLY") continue;
    if (row.deleted) {
      byId.delete(row.id);
      continue;
    }
    const waiting = pending.has(row.id);
    if (!waiting && byId.has(row.id)) continue;
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
