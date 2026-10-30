"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AUDIENCE_OPTIONS } from "@/domain/activity-access";
import { roleLabel } from "@/domain/roles";
import type { AudienceLabel, EventVisibility, UserRole } from "@/domain/types";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Select } from "@/core/ui/select";
import { Textarea } from "@/core/ui/textarea";
import { previewEventAction, saveEventAction } from "../actions";

export interface EventFormValues {
  id?: string;
  version?: number;
  title: string;
  description: string;
  location: string;
  isAllDay: boolean;
  startAt: string;
  endAt: string;
  scope: "LOCAL" | "SECTIONAL";
  visibility: EventVisibility;
  churchId: string;
  ministryId: string;
  hostChurchId: string;
  atOwnChurch: boolean;
  audience: AudienceLabel | "";
  actingRole: UserRole;
}

export function EventForm({
  values,
  roles,
  homeChurchId,
  repChurchIds,
  ownMinistryId,
  churches,
  ministries,
}: {
  values: EventFormValues;
  roles: UserRole[];
  homeChurchId: string | null;
  repChurchIds: string[];
  ownMinistryId: number | null;
  churches: Array<{ id: string; name: string; isActive: boolean }>;
  ministries: Array<{ id: number; name: string }>;
}) {
  const router = useRouter();
  const [role, setRole] = useState(values.actingRole);
  const [scope, setScope] = useState(values.scope);
  const [allDay, setAllDay] = useState(values.isAllDay);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const activeChurches = churches.filter((church) => church.isActive);
  const repChurches = churches.filter((church) => repChurchIds.includes(church.id));
  const singleChurch = repChurches.length <= 1;
  const localChurch = role === "CHURCH_REP" ? (singleChurch ? repChurches[0]?.id ?? homeChurchId ?? "" : values.churchId) : values.churchId;
  const ministryValue = role === "SECTION_MINISTRY_REP" ? String(ownMinistryId ?? "") : values.ministryId;

  async function submit(formData: FormData, saveAnyway: boolean) {
    setError(null);
    setPending(true);
    if (!saveAnyway) {
      const preview = await previewEventAction(formData);
      if (!preview.ok) {
        setPending(false);
        setError(preview.error);
        return;
      }
      if (preview.data.warnings.length > 0) {
        setWarnings(preview.data.warnings);
        setPending(false);
        return;
      }
    }
    const saved = await saveEventAction(formData);
    setPending(false);
    if (!saved.ok) {
      setError(saved.error);
      return;
    }
    router.push(`/calendar/${saved.data.id}`);
    router.refresh();
  }

  const showScope = role === "ADMIN" || role === "SECTION_PRESBYTERY";
  const effectiveScope = role === "CHURCH_REP" ? "LOCAL" : role === "SECTION_MINISTRY_REP" ? "SECTIONAL" : scope;

  return (
    <form action={(formData) => submit(formData, false)} className="space-y-3">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {values.version != null && <input type="hidden" name="expected_version" value={values.version} />}
      <input type="hidden" name="acting_role" value={role} />
      <input type="hidden" name="scope" value={effectiveScope} />
      {role === "CHURCH_REP" && singleChurch && <input type="hidden" name="church_id" value={localChurch} />}
      {role === "SECTION_MINISTRY_REP" && <input type="hidden" name="ministry_id" value={ministryValue} />}

      {roles.length > 1 && (
        <div className="space-y-1">
          <Label htmlFor="acting_role_picker">Acting as</Label>
          <Select
            id="acting_role_picker"
            value={role}
            onChange={(event) => {
              const next = event.target.value as UserRole;
              setRole(next);
              if (next === "CHURCH_REP") setScope("LOCAL");
              if (next === "SECTION_MINISTRY_REP") setScope("SECTIONAL");
              setWarnings([]);
            }}
          >
            {roles.map((item) => (
              <option key={item} value={item}>{roleLabel(item)}</option>
            ))}
          </Select>
        </div>
      )}

      {showScope && (
        <div className="space-y-1">
          <Label htmlFor="scope_picker">Kind</Label>
          <Select id="scope_picker" value={scope} onChange={(event) => setScope(event.target.value as "LOCAL" | "SECTIONAL")}>
            {role === "SECTION_PRESBYTERY" && <option value="LOCAL">Local — home church</option>}
            {role === "ADMIN" && <option value="LOCAL">Local — public</option>}
            <option value="SECTIONAL">Sectional</option>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={values.title} />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-gray-800">
        <input
          type="checkbox"
          name="is_all_day"
          className="h-5 w-5"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
        />
        All day
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="start_at">Start</Label>
          <Input id="start_at" name="start_at" type={allDay ? "date" : "datetime-local"} required defaultValue={values.startAt} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="end_at">End</Label>
          <Input id="end_at" name="end_at" type={allDay ? "date" : "datetime-local"} required defaultValue={values.endAt} />
        </div>
      </div>

      {effectiveScope === "LOCAL" && role === "CHURCH_REP" && !singleChurch && (
        <div className="space-y-1">
          <Label htmlFor="church_id">Church</Label>
          <Select id="church_id" name="church_id" defaultValue={values.churchId || localChurch} required>
            {repChurches.map((church) => (
              <option key={church.id} value={church.id}>{church.name}</option>
            ))}
          </Select>
        </div>
      )}
      {effectiveScope === "LOCAL" && role === "ADMIN" && (
        <div className="space-y-1">
          <Label htmlFor="church_id">Church</Label>
          <Select id="church_id" name="church_id" defaultValue={values.churchId} required>
            <option value="">Choose a church</option>
            {activeChurches.map((church) => (
              <option key={church.id} value={church.id}>{church.name}</option>
            ))}
          </Select>
        </div>
      )}
      {effectiveScope === "LOCAL" && role === "SECTION_PRESBYTERY" && (
        <input type="hidden" name="church_id" value={homeChurchId ?? ""} />
      )}
      {effectiveScope === "LOCAL" && role !== "ADMIN" && (
        <div className="space-y-1">
          <Label htmlFor="visibility">Who can see it</Label>
          <Select id="visibility" name="visibility" defaultValue={values.visibility}>
            <option value="PUBLIC">Public — other churches can see it</option>
            <option value="CHURCH_ONLY">Church only</option>
          </Select>
        </div>
      )}
      {effectiveScope === "LOCAL" && (
        <label className="flex min-h-11 items-center gap-3 text-sm text-gray-800">
          <input type="checkbox" name="at_own_church" className="h-5 w-5" defaultChecked={values.atOwnChurch} />
          At our church
        </label>
      )}

      {effectiveScope === "SECTIONAL" && role !== "SECTION_MINISTRY_REP" && (
        <div className="space-y-1">
          <Label htmlFor="ministry_id">Ministry</Label>
          <Select id="ministry_id" name="ministry_id" defaultValue={values.ministryId}>
            <option value="">General — no ministry</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>{ministry.name}</option>
            ))}
          </Select>
        </div>
      )}
      {effectiveScope === "SECTIONAL" && (
        <div className="space-y-1">
          <Label htmlFor="host_church_id">Host church</Label>
          <Select id="host_church_id" name="host_church_id" defaultValue={values.hostChurchId}>
            <option value="">No host church</option>
            {activeChurches.map((church) => (
              <option key={church.id} value={church.id}>{church.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" defaultValue={values.location} />
        <p className="page-copy">Where people should go, such as a hall or an address. It does not decide clashes.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} defaultValue={values.description} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="audience">Audience label</Label>
        <Select id="audience" name="audience" defaultValue={values.audience}>
          <option value="">None</option>
          {AUDIENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <p className="page-copy">A label only. It does not hide the event.</p>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-conflict bg-white p-4" role="alert">
          <p className="text-sm font-semibold text-gray-900">This overlaps another event</p>
          {warnings.map((warning) => (
            <p key={warning} className="page-copy text-conflict">{warning}</p>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={() => setWarnings([])}>
            Change time
          </Button>
          <Button type="button" className="w-full" disabled={pending} onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) void submit(new FormData(form), true);
          }}>
            Save anyway
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {warnings.length === 0 && (
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save event"}
        </Button>
      )}
    </form>
  );
}
