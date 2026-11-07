"use client";

import { useEffect, useRef, useState } from "react";
import { queueMemberCreate, runSync } from "@/composition/browser";
import { toProperCase } from "@/domain/directory";
import { memberDraftFromForm } from "@/domain/member-form";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Select } from "@/core/ui/select";
import { SAVE_DEBOUNCE_MS } from "@/core/ui/autosave";

export function MemberForm({
  churchId,
  ministries,
}: {
  churchId: string;
  ministries: Array<{ id: number; name: string }>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fullName, setFullName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "added" | "queued">("idle");
  const [addedCount, setAddedCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    return () => {
      if (!syncTimer.current) return;
      clearTimeout(syncTimer.current);
      void runSync();
    };
  }, []);

  function scheduleSync() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncTimer.current = null;
      void runSync();
    }, SAVE_DEBOUNCE_MS);
  }

  function resetForm() {
    formRef.current?.reset();
    setFullName("");
  }

  async function onSubmit(formData: FormData) {
    setError(null);
    setStatus("idle");
    const fullNameValue = toProperCase(String(formData.get("full_name") ?? ""));
    if (!fullNameValue) {
      setError("Enter the member's full name.");
      return;
    }
    formData.set("full_name", fullNameValue);
    setPending(true);
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    try {
      await queueMemberCreate(churchId, memberDraftFromForm(formData));
      resetForm();
      if (offline) {
        setQueuedCount((count) => count + 1);
        setStatus("queued");
      } else {
        setAddedCount((count) => count + 1);
        setStatus("added");
        scheduleSync();
      }
    } catch {
      setError("Could not add this member.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <input type="hidden" name="church_id" value={churchId} />
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
        <Select id="ministry_id" name="ministry_id" required defaultValue="">
          <option value="">Choose a department</option>
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
          <Input id="birth_month" name="birth_month" type="number" min={1} max={12} inputMode="numeric" placeholder="MM" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="birth_day">Birth day</Label>
          <Input id="birth_day" name="birth_day" type="number" min={1} max={31} inputMode="numeric" placeholder="DD" />
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
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {status === "added" && (
        <p className="page-copy" role="status">
          Saved.
        </p>
      )}
      {status === "queued" && (
        <p className="page-copy" role="status">
          Saved on this phone. It will sync when you are online.
        </p>
      )}
      {(addedCount > 0 || queuedCount > 0) && (
        <p className="page-copy">
          {[
            addedCount > 0 ? `${addedCount} added this session` : null,
            queuedCount > 0 ? `${queuedCount} waiting to sync` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Add member"}
      </Button>
    </form>
  );
}
