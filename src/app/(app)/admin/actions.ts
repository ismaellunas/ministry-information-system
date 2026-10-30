"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, createServices } from "@/composition/server";
import type { RoleAssignment } from "@/domain/types";
import {
  createUserFieldsSchema,
  parseInput,
  parseUserRole,
  roleAssignmentSchema,
  updateUserFieldsSchema,
  userIdSchema,
} from "@/domain/schemas";
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
    const fields = parseInput(createUserFieldsSchema, {
      email: String(formData.get("email") ?? ""),
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      phoneNumber: String(formData.get("phone") ?? ""),
    });
    const created = await admin.createUser({
      ...fields,
      roles: parseInput(z.array(roleAssignmentSchema).min(1, "Assign at least one role."), parseRoles(formData)),
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
    const fields = parseInput(updateUserFieldsSchema, {
      id: String(formData.get("profile_id") ?? ""),
      firstName: String(formData.get("first_name") ?? ""),
      lastName: String(formData.get("last_name") ?? ""),
      phoneNumber: String(formData.get("phone") ?? ""),
    });
    await admin.updateUser(fields.id, {
      firstName: fields.firstName,
      lastName: fields.lastName,
      phoneNumber: fields.phoneNumber,
    });
    revalidatePath(`/admin/users/${fields.id}`);
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
    const profileId = parseInput(userIdSchema, String(formData.get("profile_id") ?? ""));
    const role = parseUserRole(String(formData.get("role") ?? ""));
    const churchRaw = String(formData.get("church_id") ?? "");
    const ministryRaw = String(formData.get("ministry_id") ?? "");
    await admin.addRole(
      profileId,
      parseInput(roleAssignmentSchema, {
        role,
        churchId: role === "CHURCH_REP" && churchRaw ? churchRaw : null,
        ministryId: role === "SECTION_MINISTRY_REP" && ministryRaw ? Number(ministryRaw) : null,
      })
    );
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
    const profileId = parseInput(userIdSchema, String(formData.get("profile_id") ?? ""));
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
    const id = parseInput(userIdSchema, String(formData.get("profile_id") ?? ""));
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
    await admin.revokeSessions(parseInput(userIdSchema, String(formData.get("profile_id") ?? "")));
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
    const password = await admin.resetPassword(parseInput(userIdSchema, String(formData.get("profile_id") ?? "")));
    return ok({ temporaryPassword: password });
  } catch (error) {
    return fail(error);
  }
}
