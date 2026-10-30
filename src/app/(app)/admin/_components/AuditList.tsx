"use client";

import type { AuditEntry } from "@/domain/types";
import { searchableText } from "@/domain/search";
import { SearchableList } from "@/core/ui/searchable-list";

export function AuditList({ rows }: { rows: AuditEntry[] }) {
  return (
    <SearchableList
      items={rows}
      itemKey={(row) => String(row.id)}
      getSearchText={(row) =>
        searchableText([
          row.action,
          row.entity,
          row.entityId,
          new Date(row.createdAt).toLocaleString("en-PH"),
        ])
      }
      placeholder="Action, entity, or date"
      noneYet="No audit rows yet."
      noneFound={(query) => `No audit rows match “${query}”.`}
    >
      {(row) => (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
          <p className="text-sm font-semibold text-gray-900">{row.action}</p>
          <p className="page-copy">
            {row.entity} {row.entityId}
          </p>
          <p className="page-copy">{new Date(row.createdAt).toLocaleString("en-PH")}</p>
        </div>
      )}
    </SearchableList>
  );
}
