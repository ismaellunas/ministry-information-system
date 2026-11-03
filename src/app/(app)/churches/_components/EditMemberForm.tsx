"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Member } from "@/domain/types";
import { toProperCase } from "@/domain/directory";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Select } from "@/core/ui/select";
import { deleteMemberAction, updateMemberAction } from "../[id]/members/actions";

export function EditMemberForm({
  member,
  ministries,
}: {
  member: Member;
  ministries: Array<{ id: number; name: string }>;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(member.fullName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    const fullNameValue = toProperCase(String(formData.get("full_name") ?? ""));
    if (!fullNameValue) {
      setError("Enter the member's full name.");
      return;
    }
    formData.set("full_name", fullNameValue);
    setPending(true);
    const result = await updateMemberAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFullName(fullNameValue);
    setSaved(true);
    router.refresh();
  }

  async function onDelete() {
    if (!window.confirm(`Remove ${member.fullName} from the roster? This cannot be undone.`)) return;
    setError(null);
    setPending(true);
    const formData = new FormData();
    formData.set("id", member.id);
    formData.set("church_id", member.churchId);
    const result = await deleteMemberAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/churches/${member.churchId}/members`);
  }

  return (
    <div className="space-y-6">
      <form action={onSubmit} className="space-y-3">
        <input type="hidden" name="id" value={member.id} />
        <input type="hidden" name="church_id" value={member.churchId} />
        <div className="space-y-1">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            autoComplete="off"
            autoCapitalize="words"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            onBlur={(event) => setFullName(toProperCase(event.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ministry_id">Department</Label>
          <Select id="ministry_id" name="ministry_id" required defaultValue={member.ministryId}>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="birth_month">Birth month</Label>
            <Input
              id="birth_month"
              name="birth_month"
              type="number"
              min={1}
              max={12}
              inputMode="numeric"
              placeholder="MM"
              defaultValue={member.birthMonth ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="birth_day">Birth day</Label>
            <Input
              id="birth_day"
              name="birth_day"
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              placeholder="DD"
              defaultValue={member.birthDay ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="birth_year">Birth year</Label>
            <Input
              id="birth_year"
              name="birth_year"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              inputMode="numeric"
              placeholder="YYYY"
              defaultValue={member.birthYear ?? ""}
            />
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="page-copy" role="status">
            Saved.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>
      <Button type="button" variant="destructive" className="w-full" disabled={pending} onClick={() => void onDelete()}>
        Delete member
      </Button>
    </div>
  );
}
