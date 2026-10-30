import { isOpenClash } from "@/domain/conflict-view";
import type { Activity, Church, Ministry, Profile } from "@/domain/types";
import type { ClashMark } from "@/domain/conflict-view";
import { homeChurchId } from "@/domain/activity-access";
import type { CalendarItem } from "./_components/CalendarBoard";

export function toCalendarItems(
  actor: Profile,
  events: Activity[],
  marks: ClashMark[],
  churches: Church[],
  ministries: Ministry[]
): CalendarItem[] {
  const churchName = new Map(churches.map((church) => [church.id, church.name]));
  const ministryName = new Map(ministries.map((ministry) => [ministry.id, ministry.name]));
  const clash = new Map<string, string>();
  for (const mark of marks) {
    if (isOpenClash(mark) && !clash.has(mark.eventId)) clash.set(mark.eventId, mark.message);
  }
  const home = homeChurchId(actor);
  return events.map((event) => {
    const churchId = event.churchId ?? event.hostChurchId;
    return {
      id: event.id,
      title: event.title,
      start: event.startAt.toISOString(),
      end: event.endAt.toISOString(),
      allDay: event.isAllDay,
      scope: event.scope,
      ministryId: event.ministryId,
      churchId,
      churchName: churchId ? churchName.get(churchId) ?? null : null,
      ministryName: event.ministryId ? ministryName.get(event.ministryId) ?? null : null,
      location: event.location,
      ownChurch: event.churchId != null && event.churchId === home,
      clash: clash.has(event.id),
      clashMessage: clash.get(event.id) ?? null,
    };
  });
}
