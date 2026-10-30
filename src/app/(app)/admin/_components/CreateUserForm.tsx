"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Church, Ministry } from "@/domain/types";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Select } from "@/core/ui/select";
import { createUserAction } from "@/app/(app)/admin/actions";
import { PasswordReveal } from "./PasswordReveal";

export function CreateUserForm({
  churches,
  ministries,
}: {
  churches: Church[];
  ministries: Ministry[];
}) {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  const [churchRep, setChurchRep] = useState(true);
  const [presbytery, setPresbytery] = useState(false);
  const [ministryRep, setMinistryRep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const result = await createUserAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPassword(result.data.temporaryPassword);
    setCreatedId(result.data.id);
    router.refresh();
  }

  const activeChurches = churches.filter((church) => church.isActive);

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="off" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="first_name">First name</Label>
        <Input id="first_name" name="first_name" required autoComplete="off" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="last_name">Last name</Label>
        <Input id="last_name" name="last_name" required autoComplete="off" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="off" />
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-gray-200 p-4">
        <legend className="text-sm font-semibold text-gray-900">Roles</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            name="role_admin"
            className="h-5 w-5 rounded border-gray-300"
            checked={admin}
            onChange={(event) => {
              setAdmin(event.target.checked);
              if (event.target.checked) {
                setChurchRep(false);
                setPresbytery(false);
                setMinistryRep(false);
              }
            }}
          />
          Admin (cannot be combined with other roles)
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            name="role_church"
            className="h-5 w-5 rounded border-gray-300"
            checked={churchRep}
            disabled={admin || presbytery}
            onChange={(event) => setChurchRep(event.target.checked)}
          />
          Church representative
        </label>
        {(churchRep || presbytery) && !admin && (
          <div className="space-y-1">
            <Label htmlFor="church_id">Church</Label>
            <Select id="church_id" name="church_id" required>
              <option value="">Select a church</option>
              {activeChurches.map((church) => (
                <option key={church.id} value={church.id}>{church.name}</option>
              ))}
            </Select>
          </div>
        )}
        <label className="flex min-h-11 items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            name="role_presbytery"
            className="h-5 w-5 rounded border-gray-300"
            checked={presbytery}
            disabled={admin}
            onChange={(event) => {
              setPresbytery(event.target.checked);
              if (event.target.checked) setChurchRep(true);
            }}
          />
          Presbytery (also needs a home church)
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            name="role_ministry"
            className="h-5 w-5 rounded border-gray-300"
            checked={ministryRep}
            disabled={admin}
            onChange={(event) => setMinistryRep(event.target.checked)}
          />
          Section ministry representative
        </label>
        {ministryRep && !admin && (
          <div className="space-y-1">
            <Label htmlFor="ministry_id">Ministry</Label>
            <Select id="ministry_id" name="ministry_id" required>
              <option value="">Select a ministry</option>
              {ministries.map((ministry) => (
                <option key={ministry.id} value={ministry.id}>
                  {ministry.name}
                  {ministry.allowsChurchlessRep ? " (church optional)" : ""}
                </option>
              ))}
            </Select>
          </div>
        )}
      </fieldset>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {password && (
        <div className="space-y-3">
          <PasswordReveal password={password} />
          {createdId && (
            <Link href={`/admin/users/${createdId}`} className="flex min-h-11 items-center text-sm font-medium text-brand-500">
              Open this user
            </Link>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}
