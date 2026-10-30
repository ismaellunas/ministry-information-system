import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/domain/errors";
import type { PresbyteryHat, Profile } from "@/domain/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TypedSupabaseClient } from "@/repositories/supabase/client";
import { SupabaseActivityRepository } from "@/repositories/supabase/activity.repository";
import { SupabaseAuditRepository } from "@/repositories/supabase/audit.repository";
import { SupabaseChurchRepository } from "@/repositories/supabase/church.repository";
import { SupabaseConflictRepository } from "@/repositories/supabase/conflict.repository";
import { SupabaseCountRepository } from "@/repositories/supabase/count.repository";
import { SupabaseMinistryRepository } from "@/repositories/supabase/ministry.repository";
import { SupabaseNotificationRepository } from "@/repositories/supabase/notification.repository";
import { SupabaseProfileRepository } from "@/repositories/supabase/profile.repository";
import { ActivityService } from "@/services/activity.service";
import { AdminService } from "@/services/admin.service";
import { ChurchService } from "@/services/church.service";
import { ConflictService } from "@/services/conflict.service";
import { CountService } from "@/services/count.service";
import { NotificationService } from "@/services/notification.service";
import { SyncService } from "@/services/sync.service";

function asTyped(client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>): TypedSupabaseClient {
  return client as unknown as TypedSupabaseClient;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const db = asTyped(await createClient());
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
  const userDb = asTyped(await createClient());
  const adminDb = asTyped(createAdminClient());
  const userProfiles = new SupabaseProfileRepository(userDb);
  const adminProfiles = new SupabaseProfileRepository(adminDb);
  const churchRepo = new SupabaseChurchRepository(userDb);
  const adminChurches = new SupabaseChurchRepository(adminDb);
  const ministries = new SupabaseMinistryRepository(userDb);
  const counts = new SupabaseCountRepository(userDb);
  const auditRead = new SupabaseAuditRepository(userDb);
  const auditWrite = new SupabaseAuditRepository(adminDb);
  const activities = new SupabaseActivityRepository(userDb, adminDb);
  const conflictRows = new SupabaseConflictRepository(adminDb);
  const notifications = new SupabaseNotificationRepository(userDb, adminDb);
  const conflicts = new ConflictService(activities, conflictRows, adminProfiles, adminChurches, notifications);
  const activityService = new ActivityService(actor, activities, churchRepo, ministries, adminProfiles, conflicts, auditWrite);

  return {
    churches: new ChurchService(actor, churchRepo, userProfiles, auditWrite, userDb),
    counts: new CountService(actor, counts, ministries, auditWrite),
    admin: new AdminService(actor, adminProfiles, churchRepo, ministries, auditWrite, adminDb),
    activities: activityService,
    sync: new SyncService(actor, activities, activityService),
    conflicts,
    notifications: new NotificationService(notifications),
    ministries,
    auditRead,
  };
}

export async function markPasswordChanged(profileId: string): Promise<void> {
  const db = asTyped(await createClient());
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.id !== profileId) {
    throw new AppError("FORBIDDEN", "You can only change your own password flag.");
  }
  const profiles = new SupabaseProfileRepository(db);
  await profiles.setMustChangePassword(profileId, false);
}

export async function getPresbyteryHat(): Promise<PresbyteryHat> {
  const jar = await cookies();
  return jar.get("presbytery_hat")?.value === "section" ? "section" : "church";
}
