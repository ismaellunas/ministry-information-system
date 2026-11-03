import { createServices, requireProfile } from "@/composition/server";
import { sortDirectoryChurches } from "@/domain/directory";
import { cachedFetch } from "@/lib/page-cache";
import { CreateChurchForm } from "./_components/ChurchForms";
import { ChurchList } from "./_components/ChurchList";

export const metadata = { title: "Directory — West Section MIS" };

export default async function ChurchesPage() {
  const actor = await requireProfile();
  const { churches } = await createServices(actor);
  const list = sortDirectoryChurches(
    await cachedFetch(() => churches.list(true), actor.id, "churches-list", ["churches"], 60)
  );
  const isAdmin = actor.roles.some((role) => role.role === "ADMIN");

  return (
    <div className="space-y-6">
      <h1 className="page-title">Church Directory</h1>
      {isAdmin && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
          <p className="mb-3 text-sm font-semibold text-gray-900">Add church</p>
          <CreateChurchForm />
        </section>
      )}
      <ChurchList churches={list} />
    </div>
  );
}
