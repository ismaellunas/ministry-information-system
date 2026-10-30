import { z } from "zod";
import { AppError } from "./errors";
import type { RoleAssignment, UserRole } from "./types";

export function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError("VALIDATION", result.error.issues[0]?.message ?? "Invalid input.");
  }
  return result.data;
}

const emptyToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const createUserFieldsSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  firstName: z.string().trim().min(1, "First and last name are required."),
  lastName: z.string().trim().min(1, "First and last name are required."),
  phoneNumber: z.string().transform(emptyToNull),
});

export const updateUserFieldsSchema = z.object({
  id: z.string().uuid("User not found."),
  firstName: z.string().trim().min(1, "First and last name are required."),
  lastName: z.string().trim().min(1, "First and last name are required."),
  phoneNumber: z.string().transform(emptyToNull),
});

export const userIdSchema = z.string().uuid("User not found.");

const userRoleSchema = z.enum([
  "ADMIN",
  "SECTION_PRESBYTERY",
  "SECTION_MINISTRY_REP",
  "CHURCH_REP",
]);

export const roleAssignmentSchema: z.ZodType<RoleAssignment> = z.object({
  role: userRoleSchema,
  churchId: z.string().uuid().nullable(),
  ministryId: z.number().int().positive().nullable(),
});

export function parseUserRole(value: string): UserRole {
  return parseInput(userRoleSchema, value);
}

export const churchNameSchema = z.string().trim().min(1, "Church name is required.");
export const churchIdSchema = z.string().uuid("Church not found.");

export const directoryFieldsSchema = z.object({
  pastorFirstName: z.string(),
  pastorLastName: z.string(),
  pastorPhone: z.string(),
  address: z.string(),
  facebookPageUrl: z.string(),
  hotlineNumber: z.string(),
  mapPinUrl: z.string(),
});

export const saveCountSchema = z.object({
  churchId: z.string().uuid("Church not found."),
  ministryId: z.number({ invalid_type_error: "Choose a ministry." }).int().positive(),
  memberCount: z
    .number({ invalid_type_error: "Membership count must be zero or a positive whole number." })
    .int("Membership count must be zero or a positive whole number.")
    .nonnegative("Membership count must be zero or a positive whole number."),
  rosterComplete: z.boolean(),
});
