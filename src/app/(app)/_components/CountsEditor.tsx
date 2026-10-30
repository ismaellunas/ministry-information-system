"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChurchDepartmentCount, Ministry } from "@/domain/types";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { saveCountAction } from "@/app/(app)/home/actions";

export function CountsEditor({
  churchId,
  ministries,
  counts,
}: {
  churchId: string;
  ministries: Ministry[];
  counts: ChurchDepartmentCount[];
}) {
  return (
    <div className="space-y-3">
      {ministries.map((ministry) => {
        const current = counts.find((row) => row.ministryId === ministry.id);
        return (
          <CountRow
            key={ministry.id}
            churchId={churchId}
            ministry={ministry}
            current={current}
          />
        );
      })}
    </div>
  );
}

function CountRow({
  churchId,
  ministry,
  current,
}: {
  churchId: string;
  ministry: Ministry;
  current?: ChurchDepartmentCount;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    setPending(true);
    const result = await saveCountAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
      <input type="hidden" name="church_id" value={churchId} />
      <input type="hidden" name="ministry_id" value={ministry.id} />
      <p className="text-sm font-semibold text-gray-900">{ministry.name}</p>
      <div className="mt-3 space-y-3">
        <div className="space-y-1">
          <Label htmlFor={`count-${ministry.id}`}>Membership count</Label>
          <Input
            id={`count-${ministry.id}`}
            name="member_count"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={current?.memberCount ?? ""}
            inputMode="numeric"
          />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            name="roster_complete"
            defaultChecked={current?.rosterComplete ?? false}
            className="h-5 w-5 rounded border-gray-300 text-brand-500"
          />
          Roster is complete
        </label>
        {current?.rosterComplete && (
          <p className="page-copy">
            The section currently sees the roster total. Until names are added, that total is 0.
          </p>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
      {saved && <p className="mt-3 text-sm text-gray-600">Saved.</p>}
      <Button type="submit" className="mt-4 w-full" disabled={pending}>
        {pending ? "Saving…" : "Save count"}
      </Button>
    </form>
  );
}
