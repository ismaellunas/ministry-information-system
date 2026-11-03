"use server";

import { revalidatePath } from "next/cache";
import { createServices, requireProfile } from "@/composition/server";
import { churchIdSchema, createMemberSchema, memberIdSchema, parseInput, updateMemberSchema } from "@/domain/schemas";
import { fail, ok, type ActionResult } from "../../../_lib/action-result";

function birthdayFields(formData: FormData) {
  const monthRaw = String(formData.get("birth_month") ?? "");
  const dayRaw = String(formData.get("birth_day") ?? "");
  const yearRaw = String(formData.get("birth_year") ?? "");
  return {
    birthMonth: monthRaw ? Number(monthRaw) : undefined,
    birthDay: dayRaw ? Number(dayRaw) : undefined,
    birthYear: yearRaw ? Number(yearRaw) : undefined,
  };
}

export async function createMemberAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireProfile();
    const { members } = await createServices(actor);
    const idRaw = String(formData.get("id") ?? "");
    const input = parseInput(createMemberSchema, {
      id: idRaw || undefined,
      churchId: String(formData.get("church_id") ?? ""),
      ministryId: Number(formData.get("ministry_id") ?? ""),
      fullName: String(formData.get("full_name") ?? ""),
      ...birthdayFields(formData),
    });
    const saved = await members.create(input);
    revalidatePath("/");
    revalidatePath(`/churches/${input.churchId}`);
    return ok({ id: saved.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { members } = await createServices(actor);
    const churchId = parseInput(churchIdSchema, String(formData.get("church_id") ?? ""));
    const input = parseInput(updateMemberSchema, {
      id: String(formData.get("id") ?? ""),
      ministryId: Number(formData.get("ministry_id") ?? ""),
      fullName: String(formData.get("full_name") ?? ""),
      ...birthdayFields(formData),
    });
    await members.update(input);
    revalidatePath("/");
    revalidatePath(`/churches/${churchId}`);
    revalidatePath(`/churches/${churchId}/members`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { members } = await createServices(actor);
    const churchId = parseInput(churchIdSchema, String(formData.get("church_id") ?? ""));
    const id = parseInput(memberIdSchema, String(formData.get("id") ?? ""));
    await members.remove(id);
    revalidatePath("/");
    revalidatePath(`/churches/${churchId}`);
    revalidatePath(`/churches/${churchId}/members`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}
