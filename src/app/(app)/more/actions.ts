"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, updateOwnProfile } from "@/composition/server";
import { parseInput, updateOwnProfileFieldsSchema } from "@/domain/schemas";
import { fail, ok, type ActionResult } from "../_lib/action-result";

export async function updateOwnProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireProfile();
    const fields = parseInput(updateOwnProfileFieldsSchema, {
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      phoneNumber: String(formData.get("phone") ?? ""),
    });
    await updateOwnProfile(fields);
    revalidatePath("/more");
    revalidatePath("/");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
