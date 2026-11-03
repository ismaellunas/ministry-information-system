import { redirect } from "next/navigation";
import { churchRepChurchIds } from "@/domain/activity-access";
import { createServices, requireProfile } from "@/composition/server";
import { EditMemberForm } from "../../../_components/EditMemberForm";

export const metadata = { title: "Edit member — West Section MIS" };

export default async function EditMemberPage({
  params,
}: {
  params: { id: string; memberId: string };
}) {
  const actor = await requireProfile();
  if (!churchRepChurchIds(actor).includes(params.id)) {
    redirect(`/churches/${params.id}`);
  }

  const { members, ministries } = await createServices(actor);
  const [member, allMinistries] = await Promise.all([
    members.get(params.memberId),
    ministries.listAll(),
  ]);
  const tracked = allMinistries.filter((ministry) => ministry.tracksMembership);

  return (
    <div className="space-y-6">
      <h1 className="page-title">{member.fullName}</h1>
      <EditMemberForm
        member={member}
        ministries={tracked.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
      />
    </div>
  );
}
