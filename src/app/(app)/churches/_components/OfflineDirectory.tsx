"use client";

import { useEffect, useState } from "react";
import { sortDirectoryChurches } from "@/domain/directory";
import type { Church } from "@/domain/types";
import { readDirectory, readMinistries, type DirectoryMinistry } from "@/lib/directory-cache";
import { ChurchList } from "./ChurchList";

export function OfflineDirectory({ repChurchIds }: { repChurchIds: string[] }) {
  const [churches, setChurches] = useState<Church[] | null>(null);
  const [ministries, setMinistries] = useState<DirectoryMinistry[]>([]);

  useEffect(() => {
    setChurches(sortDirectoryChurches(readDirectory()));
    setMinistries(readMinistries());
  }, []);

  if (!churches) return null;
  if (churches.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="page-title">Church Directory</h1>
        <p className="page-copy">The directory opens after this phone has loaded it once.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Church Directory</h1>
      <ChurchList churches={churches} repChurchIds={repChurchIds} ministries={ministries} />
    </div>
  );
}
