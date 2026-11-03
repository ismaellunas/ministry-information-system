import type { MemberDraft } from "./types";

function optional(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  const raw = optional(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function memberDraftFromForm(formData: FormData): MemberDraft {
  const id = optional(formData.get("id"));
  const ministryId = optionalNumber(formData.get("ministry_id"));
  return {
    id: id || undefined,
    fullName: optional(formData.get("full_name")),
    ministryId: ministryId ?? 0,
    birthMonth: optionalNumber(formData.get("birth_month")),
    birthDay: optionalNumber(formData.get("birth_day")),
    birthYear: optionalNumber(formData.get("birth_year")),
  };
}
