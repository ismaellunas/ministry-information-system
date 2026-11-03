import { describe, expect, it } from "vitest";
import { memberDraftFromForm } from "./member-form";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("memberDraftFromForm", () => {
  it("trims the full name and parses the ministry id", () => {
    expect(memberDraftFromForm(form({ full_name: "  Juan Dela Cruz  ", ministry_id: "2" }))).toEqual({
      id: undefined,
      fullName: "Juan Dela Cruz",
      ministryId: 2,
      birthMonth: undefined,
      birthDay: undefined,
      birthYear: undefined,
    });
  });

  it("parses a full birthday", () => {
    const draft = memberDraftFromForm(
      form({ full_name: "Ana Reyes", ministry_id: "1", birth_month: "5", birth_day: "18", birth_year: "1990" })
    );
    expect(draft.birthMonth).toBe(5);
    expect(draft.birthDay).toBe(18);
    expect(draft.birthYear).toBe(1990);
  });

  it("omits birthday fields when blank", () => {
    const draft = memberDraftFromForm(form({ full_name: "Ana Reyes", ministry_id: "1" }));
    expect(draft.birthMonth).toBeUndefined();
    expect(draft.birthDay).toBeUndefined();
    expect(draft.birthYear).toBeUndefined();
  });

  it("carries a client-supplied id when present", () => {
    const draft = memberDraftFromForm(form({ id: "member-1", full_name: "Ana Reyes", ministry_id: "1" }));
    expect(draft.id).toBe("member-1");
  });
});
