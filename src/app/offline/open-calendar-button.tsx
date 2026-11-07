"use client";

import { useState } from "react";

const MISSING =
  "This phone does not have the calendar yet. Open West MIS once while you are online, then it will open here.";

export function OpenCalendarButton() {
  const [note, setNote] = useState("Open the calendar saved on this phone.");

  async function open() {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        const cache = await caches.open(key);
        const hit = await cache.match("/calendar", { ignoreSearch: true });
        const type = hit?.headers.get("content-type") ?? "";
        if (hit?.ok && type.includes("text/html")) {
          window.location.assign("/calendar");
          return;
        }
      }
      setNote(MISSING);
    } catch {
      window.location.assign("/calendar");
    }
  }

  return (
    <>
      <p className="page-copy">{note}</p>
      <button
        type="button"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white"
        onClick={() => void open()}
      >
        Open calendar
      </button>
    </>
  );
}
