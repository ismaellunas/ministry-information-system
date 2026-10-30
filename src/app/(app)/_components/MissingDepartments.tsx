import type { ChurchSummaryRow, Ministry } from "@/domain/types";

export function MissingDepartments({
  rows,
  ministries,
}: {
  rows: ChurchSummaryRow[];
  ministries: Ministry[];
}) {
  const missingByChurch = new Map<string, string[]>();
  for (const row of rows.filter((item) => !item.reported)) {
    const ministry = ministries.find((item) => item.id === row.ministryId);
    const list = missingByChurch.get(row.churchName) ?? [];
    if (ministry) list.push(ministry.name);
    missingByChurch.set(row.churchName, list);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Missing department counts</h2>
      {missingByChurch.size === 0 ? (
        <p className="page-copy">Every active church has a count for the departments you can see.</p>
      ) : (
        <div className="space-y-3">
          {Array.from(missingByChurch.entries()).map(([name, departments]) => (
            <div key={name} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
              <p className="text-sm font-semibold text-gray-900">{name}</p>
              <p className="page-copy mt-1">{departments.join(", ")}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
