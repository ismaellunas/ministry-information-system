import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { createServices, requireProfile } from "@/composition/server";
import { manilaWallDate } from "@/domain/time";
import type { PresbyteryHat } from "@/domain/types";
import { toCalendarItems } from "../calendar/items";
import { thisMonthRange } from "../_lib/home-data";
import { HomeActionCard } from "./HomeActionCard";

export async function UpcomingEventsCard({ hat }: { hat: PresbyteryHat }) {
  const actor = await requireProfile();
  const services = await createServices(actor);
  const range = thisMonthRange();
  const [{ events, marks }, churches, ministries] = await Promise.all([
    services.activities.list(range, hat),
    services.churches.list(true),
    services.ministries.listAll(),
  ]);
  const nearest = toCalendarItems(actor, events, marks, churches, ministries)[0] ?? null;

  if (!nearest) {
    return (
      <HomeActionCard
        icon={<CalendarDays className="h-5 w-5" />}
        tint="bg-amber-50 text-amber-500"
        title="Upcoming event"
        subtitle="No events this month"
      />
    );
  }

  const start = manilaWallDate(new Date(nearest.start));
  const civil = format(start, "yyyy-MM-dd");

  return (
    <HomeActionCard
      icon={<CalendarDays className="h-5 w-5" />}
      tint="bg-amber-50 text-amber-500"
      title="Upcoming event"
      subtitle={`${nearest.title} · ${format(start, "MMM d")}`}
      href={`/calendar?from=${civil}`}
    />
  );
}
