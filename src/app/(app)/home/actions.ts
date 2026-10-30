"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServices, requireProfile } from "@/composition/server";
import { AppError } from "@/domain/errors";
import { parseInput, saveCountSchema } from "@/domain/schemas";
import type { PresbyteryHat } from "@/domain/types";
import { fail, ok, type ActionResult } from "../_lib/action-result";

export async function setPresbyteryHatAction(hat: PresbyteryHat): Promise<void> {
  const actor = await requireProfile();
  if (!actor.roles.some((role) => role.role === "SECTION_PRESBYTERY")) {
    throw new AppError("FORBIDDEN", "Only the Presbytery can switch this dashboard.");
  }
  const jar = await cookies();
  jar.set("presbytery_hat", hat, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/");
}

export async function saveCountAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { counts } = await createServices(actor);
    const input = parseInput(saveCountSchema, {
      churchId: String(formData.get("church_id") ?? ""),
      ministryId: Number(formData.get("ministry_id")),
      memberCount: Number(formData.get("member_count")),
      rosterComplete: formData.get("roster_complete") === "on",
    });
    await counts.set(input);
    revalidatePath("/");
    revalidatePath("/churches");
    revalidatePath(`/churches/${input.churchId}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}
