"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServices, requireProfile, type PresbyteryHat } from "@/composition/server";
import { fail, ok, type ActionResult } from "../_lib/action-result";

export async function setPresbyteryHatAction(hat: PresbyteryHat): Promise<void> {
  const jar = await cookies();
  jar.set("presbytery_hat", hat, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/");
}

export async function saveCountAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { counts } = await createServices(actor);
    await counts.set({
      churchId: String(formData.get("church_id") ?? ""),
      ministryId: Number(formData.get("ministry_id")),
      memberCount: Number(formData.get("member_count")),
      rosterComplete: formData.get("roster_complete") === "on",
    });
    revalidatePath("/");
    revalidatePath("/churches");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
