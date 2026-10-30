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
  const [loading, setLoading] = useState(false);
  const lastSubmit = useRef(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = Date.now();
    if (loading || now - lastSubmit.current < SAVE_DEBOUNCE_MS) return;
    lastSubmit.current = now;
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
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

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set the password.");
    } finally {
      setLoading(false);
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
              required minLength={8} autoComplete="new-password" disabled={loading} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required autoComplete="new-password" disabled={loading} />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Done"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
