"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Slim progress bar that animates across the top of the app during page
 * transitions. It starts the moment a navigation begins (via the router)
 * and completes when the new pathname/search is committed.
 *
 * Uses only CSS animations — no third-party library needed.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "complete">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Commit key: changes when navigation settles
  const commitKey = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(commitKey);

  useEffect(() => {
    if (commitKey !== prevKey.current) {
      // Navigation has settled — show the "complete" flash then go idle
      setState("complete");
      prevKey.current = commitKey;
      timerRef.current = setTimeout(() => setState("idle"), 400);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [commitKey]);

  // Listen for link clicks to kick off the "loading" state immediately
  useEffect(() => {
    function onLinkClick(event: MouseEvent) {
      const anchor = (event.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      // Only internal, non-hash links trigger the bar
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      setState("loading");
    }
    document.addEventListener("click", onLinkClick, true);
    return () => document.removeEventListener("click", onLinkClick, true);
  }, []);

  if (state === "idle") return null;

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-valuetext={state === "complete" ? "Done" : "Loading"}
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] ${
        state === "complete"
          ? "bg-brand-500 transition-opacity duration-300 opacity-0"
          : "bg-brand-500"
      }`}
      style={
        state === "loading"
          ? {
              // Indeterminate animation: shoot to ~80% quickly, then crawl
              animation: "nav-progress 2s cubic-bezier(0.1, 0.4, 0.8, 1) forwards",
            }
          : { width: "100%" }
      }
    />
  );
}
