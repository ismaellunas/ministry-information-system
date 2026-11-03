"use client";

import { useRef } from "react";
import type { Profile } from "@/domain/types";
import { AutosaveForm } from "@/core/ui/autosave";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { updateOwnProfileAction } from "../actions";

export function MyProfileForm({ actor }: { actor: Profile }) {
  const saved = useRef(`${actor.firstName}\n${actor.lastName}\n${actor.phoneNumber ?? ""}`);

  return (
    <div className="px-5 py-4">
      <p className="page-copy mb-3">Signed in</p>
      <AutosaveForm
        className="space-y-3"
        save={async (formData) => {
          const next = `${String(formData.get("first_name") ?? "")}\n${String(formData.get("last_name") ?? "")}\n${String(formData.get("phone") ?? "")}`;
          if (next === saved.current) return false;
          const result = await updateOwnProfileAction(formData);
          if (!result.ok) return result.error;
          saved.current = next;
          return null;
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" name="first_name" defaultValue={actor.firstName} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" name="last_name" defaultValue={actor.lastName} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={actor.phoneNumber ?? ""} />
        </div>
      </AutosaveForm>
    </div>
  );
}
