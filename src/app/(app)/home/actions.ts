"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/composition/server";
import { AppError } from "@/domain/errors";
import type { PresbyteryHat } from "@/domain/types";

export async function setPresbyteryHatAction(hat: PresbyteryHat): Promise<void> {
  const actor = await requireProfile();
  if (!actor.roles.some((role) => role.role === "SECTION_PRESBYTERY")) {
    throw new AppError("FORBIDDEN", "Only the Presbytery can switch this dashboard.");
  }
  const jar = await cookies();
  jar.set("presbytery_hat", hat, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/");
}
