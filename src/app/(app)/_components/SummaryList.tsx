"use client";

import type { ChurchSummaryRow, Ministry } from "@/domain/types";
import { searchableText } from "@/domain/search";
import { SearchableList } from "@/core/ui/searchable-list";

export function SummaryList({
  rows,
  ministries,
}: {
  rows: ChurchSummaryRow[];
  ministries: Ministry[];
}) {
  const byChurch = new Map<string, { id: string; name: string; rows: ChurchSummaryRow[] }>();
  for (const row of rows) {
    const current = byChurch.get(row.churchId) ?? { id: row.churchId, name: row.churchName, rows: [] };
    current.rows.push(row);
    byChurch.set(row.churchId, current);
  }
  const churches = Array.from(byChurch.values());

  if (ministries.length === 0) {
    return <p className="page-copy">This ministry does not report membership counts.</p>;
  }

  return (
    <SearchableList
      items={churches}
      itemKey={(church) => church.id}
      getSearchText={(church) =>
        searchableText([
          church.name,
          ...ministries.map((ministry) => {
            const row = church.rows.find((item) => item.ministryId === ministry.id);
            return `${ministry.name} ${row?.reported ? row.memberCount : "Missing"}`;
          }),
        ])
      }
      placeholder="Church or department"
      noneYet="No active churches."
      noneFound={(query) => `No churches match “${query}”.`}
    >
      {(church) => (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
          <p className="text-sm font-semibold text-gray-900">{church.name}</p>
          <ul className="mt-3 space-y-2">
            {ministries.map((ministry) => {
              const row = church.rows.find((item: ChurchSummaryRow) => item.ministryId === ministry.id);
              return (
                <li key={ministry.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-700">{ministry.name}</span>
                  <span className="font-medium text-gray-900">
                    {row?.reported ? row.memberCount : "Missing"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </SearchableList>
  );
}
