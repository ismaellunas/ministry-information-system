import { redirect } from "next/navigation";
import { churchRepChurchIds } from "@/domain/activity-access";
import { requireProfile } from "@/composition/server";
import { ChurchChooser } from "../../_components/ChurchChooser";

export const metadata = { title: "Church — West Section MIS" };

export default async function ChurchChoosePage({ params }: { params: { id: string } }) {
  const actor = await requireProfile();
  if (!churchRepChurchIds(actor).includes(params.id)) {
    redirect(`/churches/${params.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">What would you like to do?</h1>
      <ChurchChooser churchId={params.id} />
    </div>
  );
}
