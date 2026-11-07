import { waitUntil } from "@vercel/functions";

const pending = new Set<Promise<void>>();

/** Runs after the save has already returned. On Vercel the platform is asked to keep the function alive. */
export function deferAfterResponse(work: Promise<unknown>): void {
  const tracked = Promise.resolve(work).then(
    () => undefined,
    (error: unknown) => {
      console.error("background_work_failed", error instanceof Error ? error.message : "error");
    }
  );
  pending.add(tracked);
  void tracked.finally(() => pending.delete(tracked));
  try {
    waitUntil(tracked);
  } catch {
    // The Node process keeps the promise running outside a Vercel request.
  }
}

export function flushDeferred(): Promise<void> {
  return Promise.all(Array.from(pending)).then(() => undefined);
}
