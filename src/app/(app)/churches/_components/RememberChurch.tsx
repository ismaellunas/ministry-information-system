"use client";

import { useEffect } from "react";
import type { Church } from "@/domain/types";
import { rememberChurch } from "@/lib/directory-cache";

export function RememberChurch({ church }: { church: Church }) {
  useEffect(() => {
    rememberChurch(church);
  }, [church]);
  return null;
}
