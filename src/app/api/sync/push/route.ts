import { NextResponse } from "next/server";
import { z } from "zod";
import { createServices, getCurrentProfile } from "@/composition/server";
import { activityToWire, type QueuedMutation } from "@/domain/sync";
import type { ActivityDraft, AudienceLabel, EventVisibility, UserRole } from "@/domain/types";

export const dynamic = "force-dynamic";

const roleSchema = z.enum(["ADMIN", "SECTION_PRESBYTERY", "SECTION_MINISTRY_REP", "CHURCH_REP"]);
const visibilitySchema = z.enum(["CHURCH_ONLY", "PUBLIC"]);

const mutationSchema = z.object({
  clientId: z.number().int().nullable().optional(),
  entityId: z.string().uuid(),
  op: z.enum(["save", "remove"]),
  baseVersion: z.number().int().nullable(),
  queuedAt: z.string().min(1),
  payload: z.object({
    id: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    isAllDay: z.boolean(),
    startAt: z.string(),
    endAt: z.string(),
    scope: z.enum(["LOCAL", "SECTIONAL"]),
    visibility: visibilitySchema.nullable().optional(),
    churchId: z.string().nullable().optional(),
    ministryId: z.number().nullable().optional(),
    hostChurchId: z.string().nullable().optional(),
    atOwnChurch: z.boolean().nullable().optional(),
    audience: z.string().nullable().optional(),
    actingRole: roleSchema,
  }),
});

const bodySchema = z.object({
  mutations: z.array(mutationSchema).max(50),
});

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!profile.isActive) return NextResponse.json({ error: "deactivated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "The sync payload is not valid." }, { status: 400 });
  }

  const mutations: QueuedMutation[] = parsed.data.mutations.map((row) => ({
    clientId: row.clientId ?? null,
    entityId: row.entityId,
    op: row.op,
    baseVersion: row.baseVersion,
    queuedAt: row.queuedAt,
    payload: toDraft(row.payload),
  }));

  const { sync } = await createServices(profile);
  const results = await sync.push(mutations);
  return NextResponse.json(
    {
      results: results.map((result) => ({
        clientId: result.clientId,
        entityId: result.entityId,
        status: result.status,
        error: result.error,
        activity: result.activity ? activityToWire(result.activity) : null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function toDraft(payload: z.infer<typeof mutationSchema>["payload"]): ActivityDraft {
  return {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    location: payload.location,
    isAllDay: payload.isAllDay,
    startAt: payload.startAt,
    endAt: payload.endAt,
    scope: payload.scope,
    visibility: (payload.visibility ?? undefined) as EventVisibility | undefined,
    churchId: payload.churchId ?? undefined,
    ministryId: payload.ministryId ?? undefined,
    hostChurchId: payload.hostChurchId ?? undefined,
    atOwnChurch: payload.atOwnChurch ?? undefined,
    audience: (payload.audience ?? undefined) as AudienceLabel | undefined,
    actingRole: payload.actingRole as UserRole,
  };
}
