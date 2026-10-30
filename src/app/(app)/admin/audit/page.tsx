import { createServices, requireAdmin } from "@/composition/server";
import { AuditList } from "../_components/AuditList";

export const metadata = { title: "Audit log — West Section MIS" };

export default async function AuditPage() {
  const actor = await requireAdmin();
  const { admin } = await createServices(actor);
  const rows = await admin.listAudit(100);

  return (
    <div className="space-y-4">
      <h1 className="page-title">Audit log</h1>
      <p className="page-copy">Actions only. No member names, birthdays, or phone numbers.</p>
      <AuditList rows={rows} />
    </div>
  );
}
