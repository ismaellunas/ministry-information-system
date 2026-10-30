"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { readSyncMeta, runSync, subscribeSync } from "@/composition/browser";

export function SyncEngine() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === "west-mis-sync") void runSync();
      };
      navigator.serviceWorker.addEventListener("message", onMessage);
      return () => navigator.serviceWorker.removeEventListener("message", onMessage);
    }
  }, []);

  useEffect(() => {
    void runSync();
    const sync = () => void runSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(sync, 60_000);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}

export function SyncStatusLine() {
  const [online, setOnline] = useState(true);
  const [unsent, setUnsent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      setOnline(navigator.onLine);
      void readSyncMeta().then((meta) => {
        setUnsent(meta.unsent);
        setFailed(meta.failed);
        setLastSync(meta.lastSync);
      });
    };
    read();
    const unsubscribe = subscribeSync(read);
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      unsubscribe();
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);

  const parts: string[] = [];
  if (!online) parts.push("Offline");
  if (unsent > 0) parts.push(`${unsent} unsent`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (lastSync) {
    const when = new Date(lastSync);
    if (!Number.isNaN(when.getTime())) parts.push(`Synced ${format(when, "h:mm a")}`);
  }
  if (parts.length === 0) return null;

  const text = parts.join(" · ");
  if (failed > 0) {
    return (
      <Link href="/more" className="flex min-h-11 max-w-[11rem] items-center truncate text-xs text-gray-500 sm:max-w-none">
        {text}
      </Link>
    );
  }
  return <p className="max-w-[11rem] truncate text-xs text-gray-500 sm:max-w-none">{text}</p>;
}
