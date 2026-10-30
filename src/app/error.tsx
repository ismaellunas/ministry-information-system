"use client";

import { OfflineFallback } from "./offline-fallback";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return <OfflineFallback error={error} reset={reset} />;
}
