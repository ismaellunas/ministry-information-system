"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServices, requireProfile } from "@/composition/server";
import { parseInput, parseUserRole } from "@/domain/schemas";
import type { ActivityInput } from "@/services/activity.service";
import type { AudienceLabel, EventVisibility } from "@/domain/types";
import { fail, ok, type ActionResult } from "../_lib/action-result";

const audienceSchema = z.enum([
  "PASTORS_ONLY",
  "ALL_CHURCHES",
  "PUBLIC",
  "MM_ONLY",
  "WM_ONLY",
  "YA_ONLY",
  "MM_AND_WM",
  "CHRISTIAN_EDUCATION",
]);

function optional(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function readActivity(formData: FormData): ActivityInput {
  const ministry = optional(formData.get("ministry_id"));
  const audience = optional(formData.get("audience"));
  const version = optional(formData.get("expected_version"));
  const id = optional(formData.get("id"));
  return {
    id: id || undefined,
    title: optional(formData.get("title")),
    description: optional(formData.get("description")),
    location: optional(formData.get("location")),
    isAllDay: formData.get("is_all_day") === "on",
    startAt: optional(formData.get("start_at")),
    endAt: optional(formData.get("end_at")),
    scope: parseInput(z.enum(["LOCAL", "SECTIONAL"]), optional(formData.get("scope"))),
    visibility: (optional(formData.get("visibility")) || undefined) as EventVisibility | undefined,
    churchId: optional(formData.get("church_id")) || undefined,
    ministryId: ministry ? Number(ministry) : undefined,
    hostChurchId: optional(formData.get("host_church_id")) || undefined,
    atOwnChurch: formData.get("at_own_church") === "on",
    audience: audience ? parseInput(audienceSchema, audience) as AudienceLabel : undefined,
    actingRole: parseUserRole(optional(formData.get("acting_role"))),
    expectedVersion: version ? Number(version) : undefined,
  };
}

export async function previewEventAction(formData: FormData): Promise<ActionResult<{ warnings: string[] }>> {
  try {
    const actor = await requireProfile();
    const { activities } = await createServices(actor);
    const warnings = await activities.preview(readActivity(formData));
    return ok({ warnings });
  } catch (error) {
    return fail(error);
  }
}

export async function saveEventAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireProfile();
    const { activities } = await createServices(actor);
    const saved = await activities.save(readActivity(formData));
    revalidatePath("/calendar");
    revalidatePath(`/calendar/${saved.id}`);
    revalidatePath("/notifications");
    revalidatePath("/");
    return ok({ id: saved.id });
  } catch (error) {
    return fail(error);
  }
}

export async function removeEventAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { activities } = await createServices(actor);
    const id = optional(formData.get("id"));
    const version = Number(optional(formData.get("expected_version")));
    await activities.remove(id, version);
    revalidatePath("/calendar");
    revalidatePath("/notifications");
    revalidatePath("/");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function acceptClashAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { conflicts } = await createServices(actor);
    await conflicts.accept(actor, optional(formData.get("conflict_id")));
    revalidatePath("/calendar", "layout");
    revalidatePath("/notifications");
    revalidatePath("/");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function acceptClashFormAction(formData: FormData): Promise<void> {
  await acceptClashAction(formData);
}
