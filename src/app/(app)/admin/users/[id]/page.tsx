import { notFound } from "next/navigation";
import { AppError } from "@/domain/errors";
import { createServices, requireAdmin } from "@/composition/server";
import { UserManageForms } from "../../_components/UserManageForms";

export const metadata = { title: "User — West Section MIS" };

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  const { admin, churches, ministries } = await createServices(actor);
  let user;
  try {
    user = await admin.getUser(params.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const [churchList, ministryList] = await Promise.all([
    churches.list(true),
    ministries.listAll(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="page-title">
        {user.profile.firstName} {user.profile.lastName}
      </h1>
      <UserManageForms
        profile={user.profile}
        email={user.email}
        churches={churchList}
        ministries={ministryList}
      />
    </div>
  );
}
