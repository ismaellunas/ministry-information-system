import { Building2, MapPin, Phone, User } from "lucide-react";
import { signedInRoleLabel } from "@/domain/roles";
import type { Church, Profile, UserRole } from "@/domain/types";

export function ChurchHeroCard({
  church,
  actor,
  role,
}: {
  church: Church;
  actor: Profile;
  role: UserRole;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 p-6 text-white shadow-theme-md">
      {church.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={church.logoUrl}
          alt=""
          className="absolute right-4 top-4 h-16 w-16 rounded-2xl object-cover"
        />
      ) : (
        <div className="absolute -right-6 -top-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
          <Building2 className="h-10 w-10 text-white/70" />
        </div>
      )}
      <div className={church.logoUrl ? "pr-20" : undefined}>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Local church</p>
        <h1 className="mt-1 text-xl font-bold">{church.name}</h1>
      </div>
      <div className="mt-4 space-y-2 text-sm text-white/80">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" />
          {church.address ?? "No address registered"}
        </p>
        <p className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0" />
          {church.hotlineNumber ?? church.pastorPhone ?? "No contact number"}
        </p>
        <p className="flex items-center gap-2">
          <User className="h-4 w-4 shrink-0" />
          {actor.firstName} {actor.lastName} · {signedInRoleLabel(role, actor.isPastor, actor.ncmdcId)}
        </p>
        {actor.ncmdcId && (
          <p className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0" aria-hidden="true" />
            NCMDC {actor.ncmdcId}
          </p>
        )}
      </div>
    </div>
  );
}
