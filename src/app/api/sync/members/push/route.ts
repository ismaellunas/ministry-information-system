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
  mutations: z.array(mutationSchema).max(80),
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
  try {
    const saved = await members.createMany(
      parsed.data.mutations.map((mutation) => ({
        id: mutation.payload.id,
        churchId: mutation.churchId,
        ministryId: mutation.payload.ministryId,
        fullName: mutation.payload.fullName,
        birthMonth: mutation.payload.birthMonth,
        birthDay: mutation.payload.birthDay,
        birthYear: mutation.payload.birthYear,
      }))
    );
    const results = parsed.data.mutations.map((mutation, index) => {
      const row = saved[index];
      return {
        clientId: mutation.clientId ?? null,
        status: row?.status === "created" ? ("created" as const) : ("failed" as const),
        error: row?.status === "created" ? null : row?.error ?? "Could not add this member.",
      };
    });
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Could not add these members.";
    return NextResponse.json(
      {
        results: parsed.data.mutations.map((mutation) => ({
          clientId: mutation.clientId ?? null,
          status: "failed" as const,
          error: message,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
