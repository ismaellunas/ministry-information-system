import { actingRoleChoices, churchRepChurchIds, homeChurchId } from "@/domain/activity-access";
import { todayManila } from "@/domain/time";
import { createServices, requireProfile } from "@/composition/server";
import { EventForm, type EventFormValues } from "../_components/EventForm";

export const metadata = { title: "Add event — West Section MIS" };

export default async function NewEventPage() {
  const actor = await requireProfile();
  const roles = actingRoleChoices(actor);
  if (roles.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="page-title">Add event</h1>
        <p className="page-copy">No role on this login can add events.</p>
      </div>
    );
  }
  const { churches, ministries } = await createServices(actor);
  const [churchList, ministryList] = await Promise.all([churches.list(true), ministries.listAll()]);
  const today = todayManila();
  const role = roles[0];
  const home = homeChurchId(actor);
  const ministryId = actor.roles.find((item) => item.role === "SECTION_MINISTRY_REP")?.ministryId ?? null;
  const values: EventFormValues = {
    title: "",
    description: "",
    location: "",
    isAllDay: false,
    startAt: `${today}T09:00`,
    endAt: `${today}T10:00`,
    scope: role === "SECTION_MINISTRY_REP" ? "SECTIONAL" : "LOCAL",
    visibility: "PUBLIC",
    churchId: home ?? "",
    ministryId: ministryId ? String(ministryId) : "",
    hostChurchId: "",
    atOwnChurch: true,
    audience: "",
    actingRole: role,
  };

  return (
    <div className="space-y-4">
      <h1 className="page-title">Add event</h1>
      <EventForm
        values={values}
        roles={roles}
        homeChurchId={home}
        repChurchIds={churchRepChurchIds(actor)}
        ownMinistryId={ministryId}
        churches={churchList.map((church) => ({ id: church.id, name: church.name, isActive: church.isActive }))}
        ministries={ministryList.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
      />
    </div>
  );
}
