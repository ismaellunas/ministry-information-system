"use client";

import { setPresbyteryHatAction } from "@/app/(app)/home/actions";
import type { PresbyteryHat } from "@/domain/types";
import { cn } from "@/lib/utils";

export function HatSwitch({ value }: { value: PresbyteryHat }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setPresbyteryHatAction("church")}
        className={cn(
          "flex min-h-11 items-center justify-center rounded-lg text-sm font-medium",
          value === "church" ? "bg-brand-50 text-brand-500" : "bg-white text-gray-700 border border-gray-200"
        )}
      >
        My church
      </button>
      <button
        type="button"
        onClick={() => setPresbyteryHatAction("section")}
        className={cn(
          "flex min-h-11 items-center justify-center rounded-lg text-sm font-medium",
          value === "section" ? "bg-brand-50 text-brand-500" : "bg-white text-gray-700 border border-gray-200"
        )}
      >
        The section
      </button>
    </div>
  );
}
