"use server";

import { revalidatePath } from "next/cache";
import { createServices, requireProfile } from "@/composition/server";
import { activityDraftFromForm } from "@/domain/activity-form";
import type { ActivityInput } from "@/services/activity.service";
import { fail, ok, type ActionResult } from "../_lib/action-result";

function optional(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function readActivity(formData: FormData): ActivityInput {
  return activityDraftFromForm(formData);
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
