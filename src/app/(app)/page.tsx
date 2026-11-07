import Link from "next/link";
import {
  createServices,
  getPresbyteryHat,
  requireProfile,
} from "@/composition/server";
import { cachedFetch } from "@/lib/page-cache";
import { churchRepChurchIds } from "@/domain/activity-access";
import type { PresbyteryHat, UserRole } from "@/domain/types";
import { ChurchHeroCard } from "./_components/ChurchHeroCard";
import { DistrictLinks } from "./_components/DistrictLinks";
import { DepartmentCountsSection } from "./_components/DepartmentCountsSection";
import { HatSwitch } from "./_components/HatSwitch";
import { MissingDepartments } from "./_components/MissingDepartments";
import { SectionCountsSection } from "./_components/SectionCountsSection";
import { SectionHeroCard } from "./_components/SectionHeroCard";
import { UpcomingBirthdaysCard } from "./_components/UpcomingBirthdaysCard";
import { UpcomingEventsCard } from "./_components/UpcomingEventsCard";

export const metadata = { title: "Home — West Section MIS" };

export default async function HomePage() {
  const actor = await requireProfile();
  const isAdmin = actor.roles.some((role) => role.role === "ADMIN");
  const isPresbytery = actor.roles.some((role) => role.role === "SECTION_PRESBYTERY");
  const churchIds = churchRepChurchIds(actor);
  const hat = isPresbytery ? await getPresbyteryHat() : "church";

  if (actor.roles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Home</h1>
          <p className="page-copy mt-1">
            {actor.firstName} {actor.lastName}
          </p>
        </div>
        <p className="page-copy">No roles assigned. Contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isPresbytery && <HatSwitch value={hat} />}
      {churchIds.length > 0 && (!isPresbytery || hat === "church") ? (
        <div className="space-y-6">
          {churchIds.map((id, index) => (
            <ChurchDashboard key={id} churchId={id} hat={hat} showDistrictLinks={index === 0} />
          ))}
        </div>
      ) : (
        <SectionDashboard hat={hat} />
      )}
      <MissingDepartmentsSection />
      {isAdmin && <AdminTools />}
    </div>
  );
}

async function ChurchDashboard({
  churchId,
  hat,
  showDistrictLinks,
}: {
  churchId: string;
  hat: PresbyteryHat;
  showDistrictLinks: boolean;
}) {
  const actor = await requireProfile();
  const { churches } = await createServices(actor);
  const church = await cachedFetch(
    () => churches.get(churchId),
    actor.id,
    `home-church-${churchId}`,
    ["churches"],
    60
  );
  const role = actor.roles.some((item) => item.role === "SECTION_PRESBYTERY")
    ? "SECTION_PRESBYTERY"
    : "CHURCH_REP";

  return (
    <div className="space-y-6">
      <ChurchHeroCard church={church} actor={actor} role={role} />
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">This month</h2>
        <div className="space-y-3">
          <UpcomingBirthdaysCard churchId={churchId} />
          <UpcomingEventsCard hat={hat} />
        </div>
      </section>
      {showDistrictLinks && <DistrictLinks />}
      <DepartmentCountsSection churchId={churchId} />
    </div>
  );
}

async function SectionDashboard({ hat }: { hat: PresbyteryHat }) {
  const actor = await requireProfile();
  const { churches } = await createServices(actor);
  const churchList = await cachedFetch(
    () => churches.list(true),
    actor.id,
    "home-section-churches",
    ["churches"],
    60
  );
  const activeChurchCount = churchList.filter((church) => church.isActive).length;
  const role: UserRole = actor.roles.some((item) => item.role === "ADMIN")
    ? "ADMIN"
    : actor.roles.some((item) => item.role === "SECTION_PRESBYTERY")
      ? "SECTION_PRESBYTERY"
      : "SECTION_MINISTRY_REP";

  return (
    <div className="space-y-6">
      <SectionHeroCard actor={actor} role={role} activeChurchCount={activeChurchCount} />
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">This month</h2>
        <UpcomingEventsCard hat={hat} />
      </section>
      <DistrictLinks />
      <SectionCountsSection />
    </div>
  );
}

async function MissingDepartmentsSection() {
  const actor = await requireProfile();
  const isAdmin = actor.roles.some((role) => role.role === "ADMIN");
  const isPresbytery = actor.roles.some((role) => role.role === "SECTION_PRESBYTERY");
  if (!isAdmin && !isPresbytery) return null;
  const { counts } = await createServices(actor);
  const data = await cachedFetch(
    () => counts.summary(),
    actor.id,
    "home-missing-departments",
    ["counts"],
    30
  );
  return <MissingDepartments rows={data.rows} ministries={data.ministries} />;
}

async function AdminTools() {
  const actor = await requireProfile();
  const { admin, churches: churchService } = await createServices(actor);
  const [users, churchList, audit] = await cachedFetch(
    () => Promise.all([admin.listUsers(), churchService.list(true), admin.listAudit(5)]),
    actor.id,
    "home-admin-tools"
  );
  const neverSignedIn = users.filter((user) => user.profile.isActive && !user.lastSignInAt);
  const churchesMissingReps = [];
  for (const church of churchList.filter((item) => item.isActive)) {
    const reps = users.filter(
      (user) =>
        user.profile.isActive &&
        user.profile.roles.some((role) => role.role === "CHURCH_REP" && role.churchId === church.id)
    );
    if (reps.length === 0) churchesMissingReps.push(church);
  }

  return (
    <div className="space-y-6">
      {churchesMissingReps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Active churches with no rep</h2>
          {churchesMissingReps.map((church) => (
            <Link
              key={church.id}
              href={`/churches/${church.id}`}
              className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs"
            >
              {church.name}
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Never signed in</h2>
        {neverSignedIn.length === 0 ? (
          <p className="page-copy">Every active user has signed in at least once.</p>
        ) : (
          neverSignedIn.map((user) => (
            <Link
              key={user.profile.id}
              href={`/admin/users/${user.profile.id}`}
              className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs"
            >
              <p className="text-sm font-semibold text-gray-900">
                {user.profile.firstName} {user.profile.lastName}
              </p>
              <p className="page-copy">{user.email}</p>
            </Link>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Recent audit</h2>
          <Link href="/admin/audit" className="text-sm font-medium text-brand-500">See all</Link>
        </div>
        {audit.length === 0 ? (
          <p className="page-copy">No audit rows yet.</p>
        ) : (
          <ul className="space-y-2">
            {audit.map((row) => (
              <li key={row.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
                <p className="text-sm font-medium text-gray-900">{row.action}</p>
                <p className="page-copy">{new Date(row.createdAt).toLocaleString("en-PH")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
