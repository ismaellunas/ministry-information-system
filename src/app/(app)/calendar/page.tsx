import { actingRoleChoices, homeChurchId } from "@/domain/activity-access";
import { allDayBounds, allDayRangeBounds, formatManila, todayManila } from "@/domain/time";
import { createServices, getPresbyteryHat, requireProfile } from "@/composition/server";
import { LocalCalendar } from "./_components/LocalCalendar";
import { toCalendarItems } from "./items";

export const metadata = { title: "Calendar — West Section MIS" };

const CIVIL = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const actor = await requireProfile();
  const services = await createServices(actor);
  const from = CIVIL.test(searchParams.from ?? "") ? searchParams.from! : todayManila();
  const range = allDayRangeBounds(shiftCivil(from, -7), shiftCivil(from, 42));
  const hat = actor.roles.some((role) => role.role === "SECTION_PRESBYTERY")
    ? await getPresbyteryHat()
    : "church";
  const [{ events, marks }, churches, ministries] = await Promise.all([
    services.activities.list(range, hat),
    services.churches.list(true),
    services.ministries.listAll(),
  ]);

  return (
    <div className="flex flex-col gap-2 max-md:h-[calc(100dvh-9.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:block md:h-auto md:space-y-4">
      <h1 className="page-title shrink-0">Calendar</h1>
      <LocalCalendar
        initialItems={toCalendarItems(actor, events, marks, churches, ministries)}
        churches={churches.map((church) => ({ id: church.id, name: church.name }))}
        ministries={ministries.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
        from={from}
        canAdd={actingRoleChoices(actor).length > 0}
        homeChurchId={homeChurchId(actor)}
        hideChurchOnly={hat === "section"}
      />
    </div>
  );
}

function shiftCivil(civil: string, days: number): string {
  const start = allDayBounds(civil).start.getTime() + days * 86_400_000;
  return formatManila(new Date(start), "yyyy-MM-dd");
}
