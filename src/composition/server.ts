import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/domain/errors";
import type { Profile } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseAuditRepository } from "@/repositories/supabase/audit.repository";
import { SupabaseChurchRepository } from "@/repositories/supabase/church.repository";
import { SupabaseCountRepository } from "@/repositories/supabase/count.repository";
import { SupabaseMinistryRepository } from "@/repositories/supabase/ministry.repository";
import { SupabaseProfileRepository } from "@/repositories/supabase/profile.repository";
import { AdminService } from "@/services/admin.service";
import { ChurchService } from "@/services/church.service";
import { CountService } from "@/services/count.service";

export async function getCurrentProfile(): Promise<Profile | null> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const profiles = new SupabaseProfileRepository(db);
  return profiles.findById(user.id);
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.isActive) redirect("/login?reason=deactivated");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.roles.some((role) => role.role === "ADMIN")) {
    redirect("/");
  }
  return profile;
}

export async function createServices(actor: Profile) {
  const userDb = await createClient();
  const adminDb = createAdminClient();
  const userProfiles = new SupabaseProfileRepository(userDb);
  const adminProfiles = new SupabaseProfileRepository(adminDb);
  const churches = new SupabaseChurchRepository(userDb);
  const ministries = new SupabaseMinistryRepository(userDb);
  const counts = new SupabaseCountRepository(userDb);
  const auditRead = new SupabaseAuditRepository(userDb);
  const auditWrite = new SupabaseAuditRepository(adminDb);

  return {
    churches: new ChurchService(actor, churches, userProfiles, auditWrite, userDb),
    counts: new CountService(actor, counts, ministries, auditWrite),
    admin: new AdminService(actor, adminProfiles, churches, ministries, auditWrite, adminDb),
    ministries,
    auditRead,
  };
}

export async function markPasswordChanged(profileId: string): Promise<void> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.id !== profileId) {
    throw new AppError("FORBIDDEN", "You can only change your own password flag.");
  }
  const profiles = new SupabaseProfileRepository(db);
  await profiles.setMustChangePassword(profileId, false);
}

export type PresbyteryHat = "church" | "section";

export async function getPresbyteryHat(): Promise<PresbyteryHat> {
  const jar = await cookies();
  return jar.get("presbytery_hat")?.value === "section" ? "section" : "church";
}
