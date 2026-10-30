import { z } from "zod";
import { parseInput, parseUserRole } from "./schemas";
import type { ActivityDraft, AudienceLabel, EventVisibility } from "./types";

const audienceSchema = z.enum([
  "PASTORS_ONLY",
  "ALL_CHURCHES",
  "PUBLIC",
  "MM_ONLY",
  "WM_ONLY",
  "YA_ONLY",
  "MM_AND_WM",
  "CHRISTIAN_EDUCATION",
]);

function optional(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export function activityDraftFromForm(formData: FormData): ActivityDraft & { expectedVersion?: number } {
  const ministry = optional(formData.get("ministry_id"));
  const audience = optional(formData.get("audience"));
  const version = optional(formData.get("expected_version"));
  const id = optional(formData.get("id"));
  return {
    id: id || undefined,
    title: optional(formData.get("title")),
    description: optional(formData.get("description")),
    location: optional(formData.get("location")),
    isAllDay: formData.get("is_all_day") === "on",
    startAt: optional(formData.get("start_at")),
    endAt: optional(formData.get("end_at")),
    scope: parseInput(z.enum(["LOCAL", "SECTIONAL"]), optional(formData.get("scope"))),
    visibility: (optional(formData.get("visibility")) || undefined) as EventVisibility | undefined,
    churchId: optional(formData.get("church_id")) || undefined,
    ministryId: ministry ? Number(ministry) : undefined,
    hostChurchId: optional(formData.get("host_church_id")) || undefined,
    atOwnChurch: formData.get("at_own_church") === "on",
    audience: audience ? (parseInput(audienceSchema, audience) as AudienceLabel) : undefined,
    actingRole: parseUserRole(optional(formData.get("acting_role"))),
    expectedVersion: version ? Number(version) : undefined,
  };
}
