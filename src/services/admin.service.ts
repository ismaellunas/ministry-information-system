import { AppError } from "@/domain/errors";
import { generateTemporaryPassword } from "@/domain/password";
import { validateRoleSet } from "@/domain/roles";
import type { AuditEntry, Church, Ministry, Profile, RoleAssignment, UserRole } from "@/domain/types";
import type { AuditRepository } from "@/repositories/audit.repository";
import type { ChurchRepository } from "@/repositories/church.repository";
import type { MinistryRepository } from "@/repositories/ministry.repository";
import type { ProfileRepository } from "@/repositories/profile.repository";
import type { TypedSupabaseClient } from "@/repositories/supabase/client";

export interface AdminUserView {
  profile: Profile;
  email: string;
  lastSignInAt: string | null;
}

export class AdminService {
  constructor(
    private readonly actor: Profile,
    private readonly profiles: ProfileRepository,
    private readonly churches: ChurchRepository,
    private readonly ministries: MinistryRepository,
    private readonly audit: AuditRepository,
    private readonly adminAuth: TypedSupabaseClient
  ) {}

  private assertAdmin() {
    if (!this.actor.roles.some((role) => role.role === "ADMIN")) {
      throw new AppError("FORBIDDEN", "Only Admin can manage users.");
    }
  }

  async listUsers(): Promise<AdminUserView[]> {
    this.assertAdmin();
    const profiles = await this.profiles.listAll();
    const emails = await this.loadAuthMap();
    return profiles.map((profile) => ({
      profile,
      email: emails.get(profile.id)?.email ?? "",
      lastSignInAt: emails.get(profile.id)?.lastSignInAt ?? null,
    }));
  }

  async getUser(id: string): Promise<AdminUserView> {
    this.assertAdmin();
    const profile = await this.profiles.findById(id);
    if (!profile) throw new AppError("NOT_FOUND", "User not found.");
    const emails = await this.loadAuthMap();
    return {
      profile,
      email: emails.get(profile.id)?.email ?? "",
      lastSignInAt: emails.get(profile.id)?.lastSignInAt ?? null,
    };
  }

  async createUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    roles: RoleAssignment[];
  }): Promise<{ user: AdminUserView; temporaryPassword: string }> {
    this.assertAdmin();
    const email = input.email.trim().toLowerCase();
    if (!email) throw new AppError("VALIDATION", "Email is required.");
    if (!input.firstName.trim() || !input.lastName.trim()) {
      throw new AppError("VALIDATION", "First and last name are required.");
    }
    if (input.roles.length === 0) {
      throw new AppError("VALIDATION", "Assign at least one role.");
    }

    const ministries = await this.ministries.listAll();
    const churches = await this.churches.listAll(true);
    await this.assertAssignable(input.roles, ministries, churches);

    const temporaryPassword = generateTemporaryPassword();
    const created = await this.adminAuth.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      if (created.error?.message.toLowerCase().includes("already")) {
        throw new AppError("EMAIL_TAKEN", "That email already has an account.");
      }
      throw new AppError("AUTH", created.error?.message ?? "Could not create the login.");
    }

    const userId = created.data.user.id;
    try {
      await this.profiles.insert({
        id: userId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phoneNumber: input.phoneNumber?.trim() || null,
        mustChangePassword: true,
      });
      for (const role of input.roles) {
        await this.profiles.addRole(userId, role.role, role.churchId, role.ministryId);
      }
      await this.audit.record(this.actor.id, "user.create", "profile", userId, {
        roles: input.roles.map((role) => role.role),
      });
    } catch (error) {
      await this.adminAuth.auth.admin.deleteUser(userId);
      throw error;
    }

    const user = await this.getUser(userId);
    return { user, temporaryPassword };
  }

  async updateUser(
    id: string,
    data: { firstName: string; lastName: string; phoneNumber: string | null }
  ): Promise<Profile> {
    this.assertAdmin();
    if (!data.firstName.trim() || !data.lastName.trim()) {
      throw new AppError("VALIDATION", "First and last name are required.");
    }
    const profile = await this.profiles.updateOwn(id, {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phoneNumber: data.phoneNumber?.trim() || null,
    });
    await this.audit.record(this.actor.id, "user.update", "profile", id, null);
    return profile;
  }

  async addRole(profileId: string, assignment: RoleAssignment): Promise<Profile> {
    this.assertAdmin();
    const profile = await this.requireProfile(profileId);
    const ministries = await this.ministries.listAll();
    const churches = await this.churches.listAll(true);
    const next = [...toAssignments(profile), assignment];
    await this.assertAssignable(next, ministries, churches, profileId);
    await this.profiles.addRole(profileId, assignment.role, assignment.churchId, assignment.ministryId);
    await this.audit.record(this.actor.id, "user.role.add", "profile", profileId, {
      role: assignment.role,
    });
    return (await this.profiles.findById(profileId))!;
  }

  async removeRole(profileId: string, roleId: string): Promise<Profile> {
    this.assertAdmin();
    const profile = await this.requireProfile(profileId);
    const removing = profile.roles.find((role) => role.id === roleId);
    if (!removing) throw new AppError("NOT_FOUND", "Role not found.");

    if (removing.role === "CHURCH_REP" && removing.churchId) {
      await this.assertNotLastActiveRep(removing.churchId, profileId);
    }

    const remaining = toAssignments(profile).filter((_, index) => profile.roles[index].id !== roleId);
    const ministries = await this.ministries.listAll();
    const error = validateRoleSet(remaining, ministries);
    if (error) throw new AppError("ROLE_RULE", error);

    await this.profiles.removeRole(profileId, roleId);
    await this.audit.record(this.actor.id, "user.role.remove", "profile", profileId, {
      role: removing.role,
    });
    return (await this.profiles.findById(profileId))!;
  }

  async deactivate(profileId: string): Promise<void> {
    this.assertAdmin();
    if (profileId === this.actor.id) {
      throw new AppError("FORBIDDEN", "You cannot deactivate your own account.");
    }
    const profile = await this.requireProfile(profileId);
    const churchRep = profile.roles.find((role) => role.role === "CHURCH_REP");
    if (churchRep?.churchId) {
      await this.assertNotLastActiveRep(churchRep.churchId, profileId);
    }
    await this.profiles.setActive(profileId, false);
    await this.adminAuth.auth.admin.signOut(profileId, "global");
    await this.profiles.deletePushSubscriptions(profileId);
    await this.audit.record(this.actor.id, "user.deactivate", "profile", profileId, null);
  }

  async revokeSessions(profileId: string): Promise<void> {
    this.assertAdmin();
    await this.requireProfile(profileId);
    await this.adminAuth.auth.admin.signOut(profileId, "global");
    await this.audit.record(this.actor.id, "user.revoke_sessions", "profile", profileId, null);
  }

  async resetPassword(profileId: string): Promise<string> {
    this.assertAdmin();
    await this.requireProfile(profileId);
    const temporaryPassword = generateTemporaryPassword();
    const { error } = await this.adminAuth.auth.admin.updateUserById(profileId, {
      password: temporaryPassword,
    });
    if (error) throw new AppError("AUTH", error.message);
    await this.profiles.setMustChangePassword(profileId, true);
    await this.adminAuth.auth.admin.signOut(profileId, "global");
    await this.audit.record(this.actor.id, "user.reset_password", "profile", profileId, null);
    return temporaryPassword;
  }

  async listAudit(limit = 50): Promise<AuditEntry[]> {
    this.assertAdmin();
    return this.audit.listRecent(limit);
  }

  private async requireProfile(id: string): Promise<Profile> {
    const profile = await this.profiles.findById(id);
    if (!profile) throw new AppError("NOT_FOUND", "User not found.");
    return profile;
  }

  private async assertNotLastActiveRep(churchId: string, profileId: string) {
    const church = await this.churches.findById(churchId);
    if (!church?.isActive) return;
    const count = await this.profiles.countActiveRepsForChurch(churchId);
    if (count <= 1) {
      throw new AppError(
        "LAST_REP",
        "Assign another representative before removing the last active rep of an active church."
      );
    }
    void profileId;
  }

  private async assertAssignable(
    next: RoleAssignment[],
    ministries: Ministry[],
    churches: Church[],
    exceptProfileId?: string
  ) {
    const combination = validateRoleSet(next, ministries);
    if (combination) throw new AppError("ROLE_RULE", combination);

    for (const assignment of next) {
      if (assignment.role === "CHURCH_REP" && assignment.churchId) {
        const church = churches.find((item) => item.id === assignment.churchId);
        if (!church) throw new AppError("NOT_FOUND", "Church not found.");
        if (!church.isActive) {
          throw new AppError("CHURCH_CLOSED", "Cannot assign a representative to a closed church.");
        }
      }
    }

    const all = await this.profiles.listAll();
    const others = exceptProfileId ? all.filter((profile) => profile.id !== exceptProfileId) : all;

    if (next.some((role) => role.role === "SECTION_PRESBYTERY")) {
      if (others.some((profile) => profile.roles.some((role) => role.role === "SECTION_PRESBYTERY"))) {
        throw new AppError("ROLE_TAKEN", "The Presbytery role is already assigned.");
      }
    }

    for (const assignment of next.filter((role) => role.role === "SECTION_MINISTRY_REP")) {
      const taken = others.some((profile) =>
        profile.roles.some(
          (role) => role.role === "SECTION_MINISTRY_REP" && role.ministryId === assignment.ministryId
        )
      );
      if (taken) {
        throw new AppError("ROLE_TAKEN", "That ministry already has a representative.");
      }
    }
  }

  private async loadAuthMap(): Promise<Map<string, { email: string; lastSignInAt: string | null }>> {
    const map = new Map<string, { email: string; lastSignInAt: string | null }>();
    const perPage = 200;
    let page = 1;
    while (true) {
      const { data, error } = await this.adminAuth.auth.admin.listUsers({ page, perPage });
      if (error) throw new AppError("AUTH", error.message);
      for (const user of data.users) {
        map.set(user.id, {
          email: user.email ?? "",
          lastSignInAt: user.last_sign_in_at ?? null,
        });
      }
      if (data.users.length < perPage) break;
      page += 1;
    }
    return map;
  }
}

function toAssignments(profile: Profile): RoleAssignment[] {
  return profile.roles.map((role) => ({
    role: role.role,
    churchId: role.churchId,
    ministryId: role.ministryId,
  }));
}
