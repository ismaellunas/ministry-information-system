"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearLocalDatabase, unsentCount } from "@/composition/browser";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/core/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [pending, setPending] = useState(false);

  async function start() {
    const count = await unsentCount();
    if (count > 0) {
      setWaiting(count);
      setConfirming(true);
      return;
    }
    await finish();
  }

  async function finish() {
    setPending(true);
    await clearLocalDatabase();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="w-full space-y-3 py-1">
        <p className="text-sm text-gray-800">
          {waiting === 1 ? "1 event has not synced." : `${waiting} events have not synced.`} Signing out removes them from this phone.
        </p>
        <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={() => setConfirming(false)}>
          Stay signed in
        </Button>
        <Button type="button" variant="destructive" className="w-full" disabled={pending} onClick={() => void finish()}>
          Sign out anyway
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      className="w-full justify-start px-0 text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => void start()}
    >
      Sign out
    </Button>
  );
}
