import Link from "next/link";
import { requireProfile } from "@/composition/server";
import { MyProfileForm } from "./_components/MyProfileForm";
import { SignOutButton } from "./_components/SignOutButton";
import { SyncPanel } from "./_components/SyncPanel";

export const metadata = { title: "More — West Section MIS" };

export default async function MorePage() {
  const actor = await requireProfile();
  const isAdmin = actor.roles.some((role) => role.role === "ADMIN");

  return (
    <div className="space-y-4">
      <h1 className="page-title">More</h1>
      <SyncPanel />
      <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-theme-xs">
        <MyProfileForm actor={actor} />
        {isAdmin && (
          <>
            <Link href="/admin/users" className="flex min-h-14 items-center px-5 text-sm font-medium text-gray-900">
              Users
            </Link>
            <Link href="/admin/audit" className="flex min-h-14 items-center px-5 text-sm font-medium text-gray-900">
              Audit log
            </Link>
          </>
        )}
        <div className="px-5 py-3">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
