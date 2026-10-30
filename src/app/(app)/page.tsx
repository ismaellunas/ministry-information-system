import Link from "next/link";
import {
  createServices,
  getPresbyteryHat,
  requireProfile,
} from "@/composition/server";
import { CountsEditor } from "./_components/CountsEditor";
import { HatSwitch } from "./_components/HatSwitch";
import { MissingDepartments } from "./_components/MissingDepartments";
import { SummaryList } from "./_components/SummaryList";
import { Upcoming } from "./_components/Upcoming";
import { roleLabel } from "@/domain/roles";

export const metadata = { title: "Home — West Section MIS" };

export default async function HomePage() {
  const actor = await requireProfile();
  const services = await createServices(actor);
  const isAdmin = actor.roles.some((role) => role.role === "ADMIN");
  const isPresbytery = actor.roles.some((role) => role.role === "SECTION_PRESBYTERY");
  const churchId = actor.roles.find((role) => role.role === "CHURCH_REP")?.churchId ?? null;
  const isMinistryRep = actor.roles.some((role) => role.role === "SECTION_MINISTRY_REP");
  const hat = isPresbytery ? await getPresbyteryHat() : "church";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Home</h1>
        <p className="page-copy mt-1">
          {actor.firstName} {actor.lastName}
        </p>
        <ul className="mt-2 text-sm text-gray-500">
          {actor.roles.map((role) => (
            <li key={role.id}>{roleLabel(role.role)}</li>
          ))}
        </ul>
      </div>

      {isPresbytery && <HatSwitch value={hat} />}

      {isAdmin && <AdminHome />}
      {!isAdmin && churchId && (!isPresbytery || hat === "church") && (
        <ChurchCounts churchId={churchId} />
      )}
      {!isAdmin && (isMinistryRep || (isPresbytery && hat === "section")) && (
        <SectionSummary />
      )}
      {!isAdmin && <Upcoming hat={isPresbytery ? hat : "church"} />}
      {actor.roles.length === 0 && (
        <p className="page-copy">No roles assigned. Contact your administrator.</p>
      )}
    </div>
  );
}

async function ChurchCounts({ churchId }: { churchId: string }) {
  const actor = await requireProfile();
  const { counts, churches } = await createServices(actor);
  const church = await churches.get(churchId);
  const data = await counts.listForOwnChurch(churchId);
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">{church.name} membership</h2>
      <p className="page-copy">
        Type the current membership. The section keeps seeing this number until the roster is marked complete.
      </p>
      <CountsEditor churchId={churchId} ministries={data.ministries} counts={data.counts} />
    </section>
  );
}

async function SectionSummary() {
  const actor = await requireProfile();
  const { counts } = await createServices(actor);
  const data = await counts.summary();
  const isPresbytery = actor.roles.some((role) => role.role === "SECTION_PRESBYTERY");
  return (
    <div className="space-y-6">
      {isPresbytery && <MissingDepartments rows={data.rows} ministries={data.ministries} />}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Section counts</h2>
        <SummaryList rows={data.rows} ministries={data.ministries} />
      </section>
    </div>
  );
}

async function AdminHome() {
  const actor = await requireProfile();
  const { counts, admin, churches: churchService, ministries } = await createServices(actor);
  const [summary, users, churchList, ministryList, audit] = await Promise.all([
    counts.summary(),
    admin.listUsers(),
    churchService.list(true),
    ministries.listAll(),
    admin.listAudit(5),
  ]);
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
      <MissingDepartments rows={summary.rows} ministries={summary.ministries} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Section counts</h2>
        <SummaryList rows={summary.rows} ministries={summary.ministries} />
      </section>

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

      <p className="page-copy">
        {ministryList.filter((item) => item.tracksMembership).length} reporting departments · {churchList.filter((item) => item.isActive).length} active churches
      </p>
    </div>
  );
}
