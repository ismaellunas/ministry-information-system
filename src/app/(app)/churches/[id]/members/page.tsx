import { redirect } from "next/navigation";
import { churchRepChurchIds } from "@/domain/activity-access";
import { createServices, requireProfile } from "@/composition/server";
import { MembersList } from "../../_components/MembersList";

export const metadata = { title: "Members — West Section MIS" };

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ministry?: string };
}) {
  const actor = await requireProfile();
  if (!churchRepChurchIds(actor).includes(params.id)) {
    redirect(`/churches/${params.id}`);
  }

  const { members, ministries } = await createServices(actor);
  const [memberList, allMinistries] = await Promise.all([
    members.listForChurch(params.id),
    ministries.listAll(),
  ]);
  const tracked = allMinistries.filter((ministry) => ministry.tracksMembership);
  const requestedMinistryId = Number(searchParams.ministry);
  const initialMinistryId = tracked.some((ministry) => ministry.id === requestedMinistryId)
    ? requestedMinistryId
    : null;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Members</h1>
      <MembersList
        churchId={params.id}
        members={memberList}
        ministries={tracked.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
        initialMinistryId={initialMinistryId}
      />
    </div>
  );
}
