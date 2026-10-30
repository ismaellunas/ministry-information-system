import { createServices, requireProfile } from "@/composition/server";
import { InboxList } from "./_components/InboxList";

export const metadata = { title: "Inbox — West Section MIS" };

export default async function NotificationsPage() {
  const actor = await requireProfile();
  const { notifications } = await createServices(actor);
  const rows = await notifications.list();

  return (
    <div className="space-y-4">
      <h1 className="page-title">Inbox</h1>
      <p className="page-copy">Schedule clashes for you. Marking one read does not clear the red mark on the calendar.</p>
      <InboxList
        items={rows.map((row) => ({
          id: row.id,
          title: row.title,
          body: row.body,
          createdAt: row.createdAt,
          readAt: row.readAt,
          eventId: typeof row.data.eventId === "string" ? row.data.eventId : null,
        }))}
      />
    </div>
  );
}
