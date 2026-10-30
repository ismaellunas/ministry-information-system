import { createServices, requireAdmin } from "@/composition/server";
import { CreateUserForm } from "../../_components/CreateUserForm";

export const metadata = { title: "Add user — West Section MIS" };

export default async function NewUserPage() {
  const actor = await requireAdmin();
  const { churches, ministries } = await createServices(actor);
  const [churchList, ministryList] = await Promise.all([
    churches.list(true),
    ministries.listAll(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="page-title">Add user</h1>
      <CreateUserForm churches={churchList} ministries={ministryList} />
    </div>
  );
}
