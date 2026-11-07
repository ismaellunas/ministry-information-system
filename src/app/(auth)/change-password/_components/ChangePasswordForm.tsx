"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/core/ui/button";
import { SAVE_DEBOUNCE_MS } from "@/core/ui/autosave";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { Card, CardContent } from "@/core/ui/card";
import { completePasswordChangeAction } from "../actions";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"change" | "waive" | null>(null);
  const lastSubmit = useRef(0);

  function claimSubmit(): boolean {
    const now = Date.now();
    if (pending || now - lastSubmit.current < SAVE_DEBOUNCE_MS) return false;
    lastSubmit.current = now;
    setError(null);
    return true;
  }

  function goHome() {
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (!claimSubmit()) return;

    setPending("change");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      const alreadySet = updateError?.message.toLowerCase().includes("different from the old password");
      if (updateError && !alreadySet) {
        setError(updateError.message);
        return;
      }

      const flagged = await completePasswordChangeAction();
      if (!flagged.ok) {
        setError(flagged.error);
        return;
      }

      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set the password.");
    } finally {
      setPending(null);
    }
  }

  async function waive() {
    if (!claimSubmit()) return;
    setPending("waive");
    try {
      const flagged = await completePasswordChangeAction();
      if (!flagged.ok) {
        setError(flagged.error);
        return;
      }
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not keep this password.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8} autoComplete="new-password" disabled={pending !== null} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password" disabled={pending !== null} />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending !== null}>
            {pending === "change" ? "Saving…" : "Change password"}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={pending !== null} onClick={waive}>
            {pending === "waive" ? "Saving…" : "Keep this password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
