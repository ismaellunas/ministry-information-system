import { redirect } from "next/navigation";
import { churchRepChurchIds } from "@/domain/activity-access";
import { createServices, requireProfile } from "@/composition/server";
import { MemberForm } from "../../../_components/MemberForm";

export const metadata = { title: "Add member — West Section MIS" };

export default async function NewMemberPage({ params }: { params: { id: string } }) {
  const actor = await requireProfile();
  if (!churchRepChurchIds(actor).includes(params.id)) {
    redirect(`/churches/${params.id}`);
  }

  const { ministries } = await createServices(actor);
  const list = (await ministries.listAll()).filter((ministry) => ministry.tracksMembership);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Add member</h1>
      <MemberForm churchId={params.id} ministries={list} />
    </div>
  );
}
