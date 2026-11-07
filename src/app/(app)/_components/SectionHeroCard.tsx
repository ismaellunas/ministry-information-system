import { Building2, User, Users } from "lucide-react";
import { signedInRoleLabel } from "@/domain/roles";
import type { Profile, UserRole } from "@/domain/types";

export function SectionHeroCard({
  actor,
  role,
  activeChurchCount,
}: {
  actor: Profile;
  role: UserRole;
  activeChurchCount: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 p-6 text-white shadow-theme-md">
      <div className="absolute -right-6 -top-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
        <Building2 className="h-10 w-10 text-white/70" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Section overview</p>
      <h1 className="mt-1 text-xl font-bold">West Section</h1>
      <div className="mt-4 space-y-2 text-sm text-white/80">
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0" />
          {activeChurchCount} active {activeChurchCount === 1 ? "church" : "churches"}
        </p>
        <p className="flex items-center gap-2">
          <User className="h-4 w-4 shrink-0" />
          {actor.firstName} {actor.lastName} · {signedInRoleLabel(role, actor.isPastor)}
        </p>
        {actor.isPastor && actor.ncmdcId && (
          <p className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0" aria-hidden="true" />
            NCMDC {actor.ncmdcId}
          </p>
        )}
      </div>
    </div>
  );
}
