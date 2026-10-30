"use server";

import { revalidatePath } from "next/cache";
import { createServices, requireProfile } from "@/composition/server";
import {
  churchIdSchema,
  churchNameSchema,
  directoryFieldsSchema,
  parseInput,
} from "@/domain/schemas";
import { fail, ok, type ActionResult } from "../_lib/action-result";

export async function createChurchAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requireProfile();
    const { churches } = await createServices(actor);
    const church = await churches.create(parseInput(churchNameSchema, String(formData.get("name") ?? "")));
    revalidatePath("/churches");
    revalidatePath("/");
    return ok({ id: church.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateDirectoryAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { churches } = await createServices(actor);
    const id = parseInput(churchIdSchema, String(formData.get("church_id") ?? ""));
    const directory = parseInput(directoryFieldsSchema, {
      pastorFirstName: String(formData.get("pastor_first_name") ?? ""),
      pastorLastName: String(formData.get("pastor_last_name") ?? ""),
      pastorPhone: String(formData.get("pastor_phone") ?? ""),
      address: String(formData.get("address") ?? ""),
      facebookPageUrl: String(formData.get("facebook_page_url") ?? ""),
      hotlineNumber: String(formData.get("hotline_number") ?? ""),
      mapPinUrl: String(formData.get("map_pin_url") ?? ""),
    });
    await churches.updateDirectory(id, directory);
    revalidatePath(`/churches/${id}`);
    revalidatePath("/churches");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function renameChurchAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { churches } = await createServices(actor);
    const id = parseInput(churchIdSchema, String(formData.get("church_id") ?? ""));
    await churches.rename(id, parseInput(churchNameSchema, String(formData.get("name") ?? "")));
    revalidatePath(`/churches/${id}`);
    revalidatePath("/churches");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function closeChurchAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { churches } = await createServices(actor);
    const id = parseInput(churchIdSchema, String(formData.get("church_id") ?? ""));
    await churches.close(id);
    revalidatePath(`/churches/${id}`);
    revalidatePath("/churches");
    revalidatePath("/");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function uploadLogoAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { churches } = await createServices(actor);
    const id = parseInput(churchIdSchema, String(formData.get("church_id") ?? ""));
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose a logo image." };
    }
    await churches.uploadLogo(id, file);
    revalidatePath(`/churches/${id}`);
    revalidatePath("/churches");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
