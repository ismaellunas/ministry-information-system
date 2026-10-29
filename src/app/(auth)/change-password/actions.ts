"use server";

import { markPasswordChanged } from "@/composition/server";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/domain/errors";
import { fail, ok, type ActionResult } from "../../(app)/_lib/action-result";

export async function completePasswordChangeAction(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Sign in again.");
    await markPasswordChanged(user.id);
    return ok();
  } catch (error) {
    return fail(error);
  }
}
