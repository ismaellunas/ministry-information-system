import { createServices, requireProfile } from "@/composition/server";
import { DEPARTMENT_ICONS } from "../_lib/departments";
import { HomeActionCard } from "./HomeActionCard";

export async function DepartmentCountsSection({ churchId }: { churchId: string }) {
  const actor = await requireProfile();
  const { members, ministries } = await createServices(actor);
  const [memberList, allMinistries] = await Promise.all([
    members.listForChurch(churchId),
    ministries.listAll(),
  ]);
  const trackedMinistries = allMinistries.filter((ministry) => ministry.tracksMembership);
  const rows = DEPARTMENT_ICONS.map((dept) => ({
    dept,
    ministry: trackedMinistries.find((ministry) => ministry.code === dept.code),
  })).filter(
    (row): row is { dept: (typeof DEPARTMENT_ICONS)[number]; ministry: NonNullable<typeof row.ministry> } =>
      Boolean(row.ministry)
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Membership counts</h2>
        <span className="page-copy">{rows.length} departments</span>
      </div>
      <div className="space-y-3">
        {rows.map(({ dept, ministry }) => {
          const count = memberList.filter((member) => member.ministryId === ministry.id).length;
          return (
            <HomeActionCard
              key={ministry.id}
              icon={<dept.icon className="h-5 w-5" />}
              tint={dept.tint}
              title={`${ministry.name} (${count})`}
              subtitle="Registered members"
              href={`/churches/${churchId}/members?ministry=${ministry.id}`}
            />
          );
        })}
      </div>
    </section>
  );
}
