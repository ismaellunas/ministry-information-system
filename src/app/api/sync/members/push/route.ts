import { NextResponse } from "next/server";
import { z } from "zod";
import { createServices, getCurrentProfile } from "@/composition/server";
import { AppError } from "@/domain/errors";

export const dynamic = "force-dynamic";

const mutationSchema = z.object({
  clientId: z.number().int().nullable().optional(),
  churchId: z.string().uuid(),
  queuedAt: z.string().min(1),
  payload: z.object({
    id: z.string().uuid().optional(),
    fullName: z.string(),
    ministryId: z.number(),
    birthMonth: z.number().optional(),
    birthDay: z.number().optional(),
    birthYear: z.number().optional(),
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

  const { members } = await createServices(profile);
  const results = [];
  for (const mutation of parsed.data.mutations) {
    try {
      await members.create({
        id: mutation.payload.id,
        churchId: mutation.churchId,
        ministryId: mutation.payload.ministryId,
        fullName: mutation.payload.fullName,
        birthMonth: mutation.payload.birthMonth,
        birthDay: mutation.payload.birthDay,
        birthYear: mutation.payload.birthYear,
      });
      results.push({ clientId: mutation.clientId ?? null, status: "created" as const, error: null });
    } catch (error) {
      results.push({
        clientId: mutation.clientId ?? null,
        status: "failed" as const,
        error: error instanceof AppError ? error.message : "Could not add this member.",
      });
    }
  }

  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
