"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readLocalDraft } from "@/composition/browser";
import { formatManila } from "@/domain/time";
import type { UserRole } from "@/domain/types";
import { EventForm, type EventFormValues } from "./EventForm";
import { RemoveEventButton } from "./RemoveEventButton";

export function LocalEventScreen({
  id,
  roles,
  homeChurchId,
  repChurchIds,
  ownMinistryId,
  churches,
  ministries,
}: {
  id: string;
  roles: UserRole[];
  homeChurchId: string | null;
  repChurchIds: string[];
  ownMinistryId: number | null;
  churches: Array<{ id: string; name: string; isActive: boolean }>;
  ministries: Array<{ id: number; name: string }>;
}) {
  const [values, setValues] = useState<EventFormValues | null | undefined>(undefined);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void readLocalDraft(id).then((draft) => {
      if (!draft) {
        setValues(null);
        return;
      }
      const payload = draft.payload;
      const wire = draft.wire;
      const actingRole = payload?.actingRole ?? roles[0] ?? "CHURCH_REP";
      setVersion(draft.baseVersion ?? 0);
      setValues({
        id: wire.id,
        version: draft.baseVersion != null && draft.baseVersion > 0 ? draft.baseVersion : undefined,
        title: payload?.title ?? wire.title,
        description: payload?.description ?? wire.description ?? "",
        location: payload?.location ?? wire.location ?? "",
        isAllDay: payload?.isAllDay ?? wire.isAllDay,
        startAt: payload?.startAt ?? inputTime(wire.startAt, wire.isAllDay, false),
        endAt: payload?.endAt ?? inputTime(wire.endAt, wire.isAllDay, true),
        scope: payload?.scope ?? wire.scope,
        visibility: payload?.visibility ?? wire.visibility ?? "PUBLIC",
        churchId: payload?.churchId ?? wire.churchId ?? "",
        ministryId: String(payload?.ministryId ?? wire.ministryId ?? ""),
        hostChurchId: payload?.hostChurchId ?? wire.hostChurchId ?? "",
        atOwnChurch: payload?.atOwnChurch ?? wire.atOwnChurch !== false,
        audience: payload?.audience ?? wire.audience ?? "",
        actingRole,
      });
    });
  }, [id, roles]);

  if (values === undefined) return <p className="page-copy">Loading the copy on this phone…</p>;
  if (values === null) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/calendar" className="text-sm font-medium text-brand-500">Calendar</Link>
        <h1 className="page-title mt-2">{values.title}</h1>
        <p className="page-copy mt-1">On this phone. It has not reached the server yet.</p>
      </div>
      <EventForm
        values={values}
        roles={roles}
        homeChurchId={homeChurchId}
        repChurchIds={repChurchIds}
        ownMinistryId={ownMinistryId}
        churches={churches}
        ministries={ministries}
      />
      <RemoveEventButton id={id} version={version} />
    </div>
  );
}

function inputTime(iso: string, allDay: boolean, end: boolean): string {
  const date = new Date(iso);
  if (allDay) {
    const shown = end ? new Date(date.getTime() - 86_400_000) : date;
    return formatManila(shown, "yyyy-MM-dd");
  }
  return formatManila(date, "yyyy-MM-dd'T'HH:mm");
}
