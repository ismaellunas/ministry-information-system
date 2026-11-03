import { createServices, requireProfile } from "@/composition/server";
import { DEPARTMENT_ICONS } from "../_lib/departments";
import { HomeActionCard } from "./HomeActionCard";

export async function SectionCountsSection() {
  const actor = await requireProfile();
  const { counts } = await createServices(actor);
  const { ministries, rows } = await counts.summary();
  const visible = DEPARTMENT_ICONS.map((dept) => ({
    dept,
    ministry: ministries.find((ministry) => ministry.code === dept.code),
  })).filter(
    (row): row is { dept: (typeof DEPARTMENT_ICONS)[number]; ministry: NonNullable<typeof row.ministry> } =>
      Boolean(row.ministry)
  );

  if (visible.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Membership counts</h2>
        <span className="page-copy">Section-wide</span>
      </div>
      <div className="space-y-3">
        {visible.map(({ dept, ministry }) => {
          const forMinistry = rows.filter((row) => row.ministryId === ministry.id);
          const reporting = forMinistry.filter((row) => row.reported);
          const total = reporting.reduce((sum, row) => sum + (row.memberCount ?? 0), 0);
          return (
            <HomeActionCard
              key={ministry.id}
              icon={<dept.icon className="h-5 w-5" />}
              tint={dept.tint}
              title={`${ministry.name} (${total})`}
              subtitle={`${reporting.length} of ${forMinistry.length} churches reporting`}
            />
          );
        })}
      </div>
    </section>
  );
}
