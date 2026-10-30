import Link from "next/link";
import { notFound } from "next/navigation";
import { actingRoleChoices, assertCanManage, churchRepChurchIds, homeChurchId } from "@/domain/activity-access";
import { AUDIENCE_OPTIONS } from "@/domain/activity-access";
import { AppError } from "@/domain/errors";
import { formatManila } from "@/domain/time";
import { createServices, requireProfile } from "@/composition/server";
import { isOpenClash } from "@/domain/conflict-view";
import type { Activity, Profile, UserRole } from "@/domain/types";
import { acceptClashFormAction } from "../actions";
import { EventForm, type EventFormValues } from "../_components/EventForm";
import { RemoveEventButton } from "../_components/RemoveEventButton";

export const metadata = { title: "Event — West Section MIS" };

export default async function EventPage({ params }: { params: { id: string } }) {
  const actor = await requireProfile();
  const services = await createServices(actor);
  let detail;
  try {
    detail = await services.activities.get(params.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const { activity, creator, marks, canManage } = detail;
  const [churchList, ministryList] = await Promise.all([
    services.churches.list(true),
    services.ministries.listAll(),
  ]);
  const home = homeChurchId(actor);
  const open = marks.filter((mark) => isOpenClash(mark) && mark.eventId === activity.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/calendar" className="text-sm font-medium text-brand-500">Calendar</Link>
        <h1 className="page-title mt-2">{activity.title}</h1>
        <p className="page-copy mt-1">{when(activity.startAt, activity.endAt, activity.isAllDay)}</p>
      </div>

      {!canManage && (
        <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs">
          {activity.location && <p className="text-sm text-gray-900">{activity.location}</p>}
          {activity.description && <p className="whitespace-pre-line text-sm text-gray-800">{activity.description}</p>}
          {activity.audience && (
            <p className="page-copy">{AUDIENCE_OPTIONS.find((option) => option.value === activity.audience)?.label}</p>
          )}
          {creator.name && <p className="page-copy">{creator.name}</p>}
          {creator.phone && <p className="page-copy">{creator.phone}</p>}
        </div>
      )}

      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Open clash</h2>
          {open.map((mark) => (
            <div key={mark.conflictId} className="space-y-3 rounded-2xl border border-conflict bg-white p-4 shadow-theme-xs">
              <p className="text-sm text-conflict">{mark.message}</p>
              {canManage && (
                <form action={acceptClashFormAction}>
                  <input type="hidden" name="conflict_id" value={mark.conflictId} />
                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
                  >
                    Accept overlap
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>
      )}

      {canManage && (
        <EventForm
          values={toValues(activity, roleFor(actor, activity))}
          roles={actingRoleChoices(actor)}
          homeChurchId={home}
          repChurchIds={churchRepChurchIds(actor)}
          ownMinistryId={actor.roles.find((role) => role.role === "SECTION_MINISTRY_REP")?.ministryId ?? null}
          churches={churchList.map((church) => ({ id: church.id, name: church.name, isActive: church.isActive }))}
          ministries={ministryList.map((ministry) => ({ id: ministry.id, name: ministry.name }))}
        />
      )}
      {canManage && <RemoveEventButton id={activity.id} version={activity.version} />}
    </div>
  );
}

function toValues(activity: Activity, actingRole: UserRole): EventFormValues {
  const endAt = activity.isAllDay
    ? formatManila(new Date(activity.endAt.getTime() - 86_400_000), "yyyy-MM-dd")
    : formatManila(activity.endAt, "yyyy-MM-dd'T'HH:mm");
  return {
    id: activity.id,
    version: activity.version,
    title: activity.title,
    description: activity.description ?? "",
    location: activity.location ?? "",
    isAllDay: activity.isAllDay,
    startAt: activity.isAllDay ? formatManila(activity.startAt, "yyyy-MM-dd") : formatManila(activity.startAt, "yyyy-MM-dd'T'HH:mm"),
    endAt,
    scope: activity.scope,
    visibility: activity.visibility ?? "PUBLIC",
    churchId: activity.churchId ?? "",
    ministryId: activity.ministryId ? String(activity.ministryId) : "",
    hostChurchId: activity.hostChurchId ?? "",
    atOwnChurch: activity.atOwnChurch !== false,
    audience: activity.audience ?? "",
    actingRole,
  };
}

function roleFor(actor: Profile, activity: Activity): UserRole {
  for (const role of actingRoleChoices(actor)) {
    try {
      assertCanManage(
        actor,
        {
          actingRole: role,
          scope: activity.scope,
          visibility: activity.visibility,
          churchId: activity.churchId,
          ministryId: activity.ministryId,
          isNew: false,
        },
        { isActive: true }
      );
      return role;
    } catch {
      // Try the next role.
    }
  }
  return actingRoleChoices(actor)[0] ?? "CHURCH_REP";
}

function when(start: Date, end: Date, allDay: boolean) {
  if (allDay) {
    const last = formatManila(new Date(end.getTime() - 86_400_000), "MMM d, yyyy");
    const first = formatManila(start, "MMM d, yyyy");
    return first === last ? first : `${first} – ${last}`;
  }
  return `${formatManila(start, "MMM d, yyyy h:mm a")} – ${formatManila(end, "MMM d, yyyy h:mm a")}`;
}
