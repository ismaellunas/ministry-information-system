"use server";

import { revalidatePath } from "next/cache";
import { createServices, requireProfile } from "@/composition/server";
import { fail, ok, type ActionResult } from "../_lib/action-result";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireProfile();
    const { notifications } = await createServices(actor);
    await notifications.markRead(id);
    revalidatePath("/notifications");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
