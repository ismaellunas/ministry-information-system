"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { queueEventRemove } from "@/composition/browser";
import { Button } from "@/core/ui/button";
import { removeEventAction } from "../actions";

export function RemoveEventButton({ id, version }: { id: string; version: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        if (!window.confirm("Remove this event? It leaves the calendar. The record is kept.")) return;
        setError(null);
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          await queueEventRemove(id, version);
          router.push("/calendar");
          return;
        }
        try {
          const result = await removeEventAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push("/calendar");
          router.refresh();
        } catch {
          await queueEventRemove(id, version);
          router.push("/calendar");
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="expected_version" value={version} />
      {error && <p className="mb-2 text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" variant="destructive" className="w-full">Remove event</Button>
    </form>
  );
}
