"use client";

import { useEffect } from "react";

export function isConnectionError(error: Error): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = `${error.name} ${error.message}`.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("loading chunk") ||
    message.includes("chunkloaderror") ||
    message.includes("networkerror") ||
    message.includes("importing a module") ||
    message.includes("dynamically imported module")
  );
}

export function OfflineFallback({ error, reset }: { error?: Error; reset?: () => void }) {
  const offline = error ? isConnectionError(error) : typeof navigator !== "undefined" && !navigator.onLine;
  useEffect(() => {
    if (!offline || window.location.pathname.startsWith("/calendar")) return;
    window.location.assign("/calendar");
  }, [offline]);
  if (offline) return <main className="min-h-screen bg-gray-50" />;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 bg-gray-50 px-4 py-8">
      <h1 className="page-title">Something went wrong</h1>
      <p className="page-copy">This screen hit an error. Try it again.</p>
      <a
        href="/calendar"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white"
      >
        Try the calendar
      </a>
      {reset && !offline && (
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
          onClick={() => reset()}
        >
          Try again
        </button>
      )}
      <a
        href="/login"
        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
      >
        Sign in
      </a>
    </main>
  );
}
