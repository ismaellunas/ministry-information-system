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

export const updateOwnProfileFieldsSchema = updateUserFieldsSchema.omit({ id: true });

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

const optionalFormNumber = z.number().int().nullable();

export const directoryFieldsSchema = z.object({
  pastorFirstName: z.string(),
  pastorLastName: z.string(),
  pastorPhone: z.string(),
  address: z.string(),
  facebookPageUrl: z.string(),
  hotlineNumber: z.string(),
  mapPinUrl: z.string(),
  pastorBirthMonth: optionalFormNumber,
  pastorBirthDay: optionalFormNumber,
  pastorBirthYear: optionalFormNumber,
});

export const createMemberSchema = z
  .object({
    churchId: z.string().uuid("Church not found."),
    ministryId: z.number({ invalid_type_error: "Choose a department." }).int().positive(),
    fullName: z.string().trim().min(1, "Enter the member's full name."),
    id: z.string().uuid().optional(),
    birthMonth: z.number().int().min(1).max(12).optional(),
    birthDay: z.number().int().min(1).max(31).optional(),
    birthYear: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear())
      .optional(),
  })
  .refine((value) => (value.birthMonth == null) === (value.birthDay == null), {
    message: "Enter both birth month and day, or leave both blank.",
    path: ["birthDay"],
  });

export const updateMemberSchema = z
  .object({
    id: z.string().uuid("Member not found."),
    ministryId: z.number({ invalid_type_error: "Choose a department." }).int().positive(),
    fullName: z.string().trim().min(1, "Enter the member's full name."),
    birthMonth: z.number().int().min(1).max(12).optional(),
    birthDay: z.number().int().min(1).max(31).optional(),
    birthYear: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear())
      .optional(),
  })
  .refine((value) => (value.birthMonth == null) === (value.birthDay == null), {
    message: "Enter both birth month and day, or leave both blank.",
    path: ["birthDay"],
  });

export const memberIdSchema = z.string().uuid("Member not found.");
