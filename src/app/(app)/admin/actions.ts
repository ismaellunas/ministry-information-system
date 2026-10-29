"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, createServices } from "@/composition/server";
import type { RoleAssignment, UserRole } from "@/domain/types";
import { fail, ok, type ActionResult } from "../_lib/action-result";

function parseRoles(formData: FormData): RoleAssignment[] {
  const roles: RoleAssignment[] = [];
  if (formData.get("role_admin") === "on") {
    roles.push({ role: "ADMIN", churchId: null, ministryId: null });
    return roles;
  }
  const churchId = String(formData.get("church_id") ?? "") || null;
  if (formData.get("role_church") === "on") {
    roles.push({ role: "CHURCH_REP", churchId, ministryId: null });
  }
  if (formData.get("role_presbytery") === "on") {
    roles.push({ role: "SECTION_PRESBYTERY", churchId: null, ministryId: null });
  }
  if (formData.get("role_ministry") === "on") {
    const ministryId = Number(formData.get("ministry_id"));
    roles.push({
      role: "SECTION_MINISTRY_REP",
      churchId: null,
      ministryId: Number.isFinite(ministryId) ? ministryId : null,
    });
  }
  return roles;
}

export async function createUserAction(
  formData: FormData
): Promise<ActionResult<{ id: string; temporaryPassword: string }>> {
  try {
    const actor = await requireAdmin();
    const { admin } = await createServices(actor);
    const created = await admin.createUser({
      email: String(formData.get("email") ?? ""),
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      phoneNumber: String(formData.get("phone") ?? "") || null,
      roles: parseRoles(formData),
    });
    revalidatePath("/admin/users");
    revalidatePath("/");
    return ok({ id: created.user.profile.id, temporaryPassword: created.temporaryPassword });
  } catch (error) {
    return fail(error);
  }
}

export async function updateUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const { admin } = await createServices(actor);
    const id = String(formData.get("profile_id") ?? "");
    await admin.updateUser(id, {
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      phoneNumber: String(formData.get("phone") ?? "") || null,
    });
    revalidatePath(`/admin/users/${id}`);
    revalidatePath("/admin/users");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function addRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const { admin } = await createServices(actor);
    const profileId = String(formData.get("profile_id") ?? "");
    const role = String(formData.get("role") ?? "") as UserRole;
    const churchId = String(formData.get("church_id") ?? "") || null;
    const ministryRaw = String(formData.get("ministry_id") ?? "");
    const ministryId = ministryRaw ? Number(ministryRaw) : null;
    await admin.addRole(profileId, {
      role,
      churchId: role === "CHURCH_REP" ? churchId : null,
      ministryId: role === "SECTION_MINISTRY_REP" ? ministryId : null,
    });
    revalidatePath(`/admin/users/${profileId}`);
    revalidatePath("/");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function removeRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const { admin } = await createServices(actor);
    const profileId = String(formData.get("profile_id") ?? "");
    await admin.removeRole(profileId, String(formData.get("role_id") ?? ""));
    revalidatePath(`/admin/users/${profileId}`);
    revalidatePath("/");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deactivateUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const { admin } = await createServices(actor);
    const id = String(formData.get("profile_id") ?? "");
    await admin.deactivate(id);
    revalidatePath(`/admin/users/${id}`);
    revalidatePath("/admin/users");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function revokeSessionsAction(formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const { admin } = await createServices(actor);
    await admin.revokeSessions(String(formData.get("profile_id") ?? ""));
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function resetPasswordAction(
  formData: FormData
): Promise<ActionResult<{ temporaryPassword: string }>> {
  try {
    const actor = await requireAdmin();
    const { admin } = await createServices(actor);
    const password = await admin.resetPassword(String(formData.get("profile_id") ?? ""));
    return ok({ temporaryPassword: password });
  } catch (error) {
    return fail(error);
  }
}
