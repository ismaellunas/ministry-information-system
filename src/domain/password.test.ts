import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "./password";

describe("generateTemporaryPassword", () => {
  it("returns 12 characters without ambiguous glyphs", () => {
    const password = generateTemporaryPassword();
    expect(password).toHaveLength(12);
    expect(password).toMatch(/^[A-Za-z2-9]+$/);
    expect(password).not.toMatch(/[0O1lI]/);
  });
});
