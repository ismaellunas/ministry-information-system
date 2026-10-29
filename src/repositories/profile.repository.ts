import type { Profile, ProfileRole, UserRole } from "@/domain/types";

export interface NewProfile {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  mustChangePassword: boolean;
}

export interface ProfileRepository {
  findById(id: string): Promise<Profile | null>;
  listAll(): Promise<Profile[]>;
  insert(profile: NewProfile): Promise<Profile>;
  updateOwn(
    id: string,
    data: Partial<Pick<Profile, "firstName" | "lastName" | "phoneNumber">>
  ): Promise<Profile>;
  setMustChangePassword(id: string, value: boolean): Promise<void>;
  setActive(id: string, value: boolean): Promise<void>;
  addRole(
    profileId: string,
    role: UserRole,
    churchId?: string | null,
    ministryId?: number | null
  ): Promise<ProfileRole>;
  removeRole(profileId: string, roleId: string): Promise<void>;
  listRoles(profileId: string): Promise<ProfileRole[]>;
  /** How many active reps does this church have? Used before deactivation. */
  countActiveRepsForChurch(churchId: string): Promise<number>;
  countRepRolesForChurch(churchId: string): Promise<number>;
  deletePushSubscriptions(userId: string): Promise<void>;
}
