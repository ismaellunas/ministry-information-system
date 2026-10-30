import Link from "next/link";
import { createServices, requireAdmin } from "@/composition/server";
import { UserList } from "../_components/UserList";

export const metadata = { title: "Users — West Section MIS" };

export default async function AdminUsersPage() {
  const actor = await requireAdmin();
  const { admin } = await createServices(actor);
  const users = await admin.listUsers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Users</h1>
        <Link
          href="/admin/users/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white"
        >
          Add user
        </Link>
      </div>
      <UserList users={users} />
    </div>
  );
}
