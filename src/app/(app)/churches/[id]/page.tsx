import { notFound } from "next/navigation";
import { AppError } from "@/domain/errors";
import { createServices, requireProfile } from "@/composition/server";
import { CountsEditor } from "../../_components/CountsEditor";
import { DirectoryForm } from "../_components/ChurchForms";

export const metadata = { title: "Church — West Section MIS" };

export default async function ChurchDetailPage({ params }: { params: { id: string } }) {
  const actor = await requireProfile();
  const services = await createServices(actor);
  let church;
  try {
    church = await services.churches.get(params.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const canEdit = services.churches.canEditDirectory(church.id);
  const isAdmin = actor.roles.some((role) => role.role === "ADMIN");
  const isOwnChurch = actor.roles.some(
    (role) => role.role === "CHURCH_REP" && role.churchId === church.id
  );

  const counts = isOwnChurch ? await services.counts.listForOwnChurch(church.id) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{church.name}</h1>
        {!church.isActive && <p className="page-copy mt-1">Closed — listed for the record.</p>}
      </div>

      {church.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={church.logoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
      )}

      {canEdit ? (
        <DirectoryForm church={church} canClose={isAdmin} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs space-y-2">
          <Row label="Pastor" value={church.pastorName} />
          <Row label="Pastor phone" value={church.pastorPhone} />
          <Row label="Hotline" value={church.hotlineNumber} />
          <Row label="Address" value={church.address} multiline />
          {church.facebookPageUrl && (
            <p>
              <a
                href={church.facebookPageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-500"
              >
                Facebook page
              </a>
            </p>
          )}
          {church.mapPinUrl && (
            <p>
              <a
                href={church.mapPinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-500"
              >
                Open in Google Maps
              </a>
            </p>
          )}
        </div>
      )}

      {counts && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Membership counts</h2>
          <CountsEditor churchId={church.id} ministries={counts.ministries} counts={counts.counts} />
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm text-gray-900${multiline ? " whitespace-pre-line" : ""}`}>{value}</p>
    </div>
  );
}
