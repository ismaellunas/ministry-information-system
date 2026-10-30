"use client";

import { useCallback, useEffect, useState } from "react";
import { keepMine, keepServer, listOutboxProblems, runSync, subscribeSync } from "@/composition/browser";
import type { LocalOutbox } from "@/lib/local-db";
import { Button } from "@/core/ui/button";
import { SearchableList } from "@/core/ui/searchable-list";

export function SyncPanel() {
  const [problems, setProblems] = useState<LocalOutbox[]>([]);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(() => {
    void listOutboxProblems().then(setProblems);
  }, []);

  useEffect(() => {
    reload();
    return subscribeSync(reload);
  }, [reload]);

  async function syncNow() {
    setPending(true);
    setNote(null);
    try {
      await runSync();
      setNote("Sync finished.");
    } catch {
      setNote("Could not sync. The changes stay on this phone.");
    } finally {
      setPending(false);
      reload();
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
      <h2 className="text-base font-semibold text-gray-900">This phone</h2>
      <p className="page-copy">Events saved offline wait here until they reach the server.</p>
      <Button type="button" className="w-full" disabled={pending} onClick={() => void syncNow()}>
        {pending ? "Syncing…" : "Sync now"}
      </Button>
      {note && <p className="page-copy">{note}</p>}
      <SearchableList
        items={problems}
        itemKey={(row) => String(row.id)}
        getSearchText={(row) => `${row.payload.title} ${row.error ?? ""} ${row.status}`}
        placeholder="Search title or error"
        noneYet="No failed changes."
        noneFound={(query) => `No changes match “${query}”.`}
      >
        {(row) => (
          <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900">{row.payload.title || "Event"}</p>
            <p className="page-copy">{row.status === "conflict" ? "The server has a newer copy." : "Failed"}</p>
            {row.error && <p className="text-sm text-destructive">{row.error}</p>}
            {row.status === "conflict" && row.id != null && (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Button type="button" className="w-full" onClick={() => void keepMine(row.id!)}>
                  Keep mine
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => void keepServer(row.id!)}>
                  Keep server
                </Button>
              </div>
            )}
          </div>
        )}
      </SearchableList>
    </section>
  );
}
