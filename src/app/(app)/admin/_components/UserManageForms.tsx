"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Church, Ministry, Profile } from "@/domain/types";
import { roleLabel } from "@/domain/roles";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Select } from "@/core/ui/select";
import {
  addRoleAction,
  deactivateUserAction,
  removeRoleAction,
  resetPasswordAction,
  revokeSessionsAction,
  updateUserAction,
} from "@/app/(app)/admin/actions";
import { PasswordReveal } from "./PasswordReveal";

export function UserManageForms({
  profile,
  email,
  churches,
  ministries,
}: {
  profile: Profile;
  email: string;
  churches: Church[];
  ministries: Ministry[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [roleKind, setRoleKind] = useState("CHURCH_REP");

  async function run(
    action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>,
    formData: FormData,
    confirmMessage?: string
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    const result = await action(formData);
    if (!result.ok) setError(result.error);
    else router.refresh();
  }

  const activeChurches = churches.filter((church) => church.isActive);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
        <p className="text-sm font-semibold text-gray-900">Account</p>
        <p className="page-copy mt-1">{email}</p>
        <p className="page-copy">{profile.isActive ? "Active" : "Deactivated"}</p>
        <form
          className="mt-4 space-y-3"
          action={(formData) => run(updateUserAction, formData)}
        >
          <input type="hidden" name="profile_id" value={profile.id} />
          <div className="space-y-1">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" name="first_name" defaultValue={profile.firstName} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" name="last_name" defaultValue={profile.lastName} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile.phoneNumber ?? ""} />
          </div>
          <Button type="submit" className="w-full">Save name</Button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
        <p className="text-sm font-semibold text-gray-900">Roles</p>
        <ul className="mt-3 space-y-3">
          {profile.roles.length === 0 && <li className="page-copy">No roles assigned.</li>}
          {profile.roles.map((role) => {
            const church = churches.find((item) => item.id === role.churchId);
            const ministry = ministries.find((item) => item.id === role.ministryId);
            return (
              <li key={role.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{roleLabel(role.role)}</p>
                  <p className="page-copy">
                    {church?.name ?? ministry?.name ?? "Section"}
                  </p>
                </div>
                <form action={(formData) => run(removeRoleAction, formData, "Remove this role?")}>
                  <input type="hidden" name="profile_id" value={profile.id} />
                  <input type="hidden" name="role_id" value={role.id} />
                  <Button type="submit" variant="ghost" className="text-destructive">
                    Remove
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>

        <form
          className="mt-4 space-y-3 border-t border-gray-200 pt-4"
          action={(formData) => run(addRoleAction, formData)}
        >
          <input type="hidden" name="profile_id" value={profile.id} />
          <div className="space-y-1">
            <Label htmlFor="role">Add role</Label>
            <Select id="role" name="role" value={roleKind} onChange={(event) => setRoleKind(event.target.value)}>
              <option value="CHURCH_REP">Church representative</option>
              <option value="SECTION_MINISTRY_REP">Ministry representative</option>
              <option value="SECTION_PRESBYTERY">Presbytery</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          {roleKind === "CHURCH_REP" && (
            <Select name="church_id" required>
              <option value="">Select a church</option>
              {activeChurches.map((church) => (
                <option key={church.id} value={church.id}>{church.name}</option>
              ))}
            </Select>
          )}
          {roleKind === "SECTION_MINISTRY_REP" && (
            <Select name="ministry_id" required>
              <option value="">Select a ministry</option>
              {ministries.map((ministry) => (
                <option key={ministry.id} value={ministry.id}>{ministry.name}</option>
              ))}
            </Select>
          )}
          <Button type="submit" variant="outline" className="w-full">Add role</Button>
        </form>
      </section>

      <section className="space-y-3">
        {password && <PasswordReveal password={password} />}
        <form
          action={async (formData) => {
            setError(null);
            const result = await resetPasswordAction(formData);
            if (!result.ok) setError(result.error);
            else {
              setPassword(result.data.temporaryPassword);
              router.refresh();
            }
          }}
        >
          <input type="hidden" name="profile_id" value={profile.id} />
          <Button type="submit" variant="outline" className="w-full">
            Generate new temporary password
          </Button>
        </form>
        <form action={(formData) => run(revokeSessionsAction, formData, "Sign this person out everywhere?")}>
          <input type="hidden" name="profile_id" value={profile.id} />
          <Button type="submit" variant="outline" className="w-full">Sign out everywhere</Button>
        </form>
        {profile.isActive && (
          <form
            action={(formData) =>
              run(deactivateUserAction, formData, "Deactivate this account and revoke sessions?")
            }
          >
            <input type="hidden" name="profile_id" value={profile.id} />
            <Button type="submit" variant="destructive" className="w-full">Deactivate</Button>
          </form>
        )}
      </section>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
