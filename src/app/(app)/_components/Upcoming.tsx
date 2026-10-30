import { allDayBounds, todayManila } from "@/domain/time";
import { createServices, requireProfile } from "@/composition/server";
import type { PresbyteryHat } from "@/domain/types";
import { toCalendarItems } from "../calendar/items";
import { UpcomingList } from "./UpcomingList";

export async function Upcoming({ hat }: { hat: PresbyteryHat }) {
  const actor = await requireProfile();
  const services = await createServices(actor);
  const start = allDayBounds(todayManila()).start;
  const end = new Date(start.getTime() + 30 * 86_400_000);
  const [{ events, marks }, churches, ministries] = await Promise.all([
    services.activities.list({ start, end }, hat),
    services.churches.list(true),
    services.ministries.listAll(),
  ]);
  const items = toCalendarItems(actor, events, marks, churches, ministries);
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Next 30 days</h2>
      <UpcomingList items={items} />
    </section>
  );
}
