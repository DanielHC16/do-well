import {
  displayNameSchema,
  emailSchema,
  homeAreaSchema,
  passwordSchema,
} from "../auth-schemas";

describe("auth schemas", () => {
  it("normalizes valid auth and onboarding input", () => {
    expect(emailSchema.parse("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(displayNameSchema.parse("  Ada Lovelace ")).toBe("Ada Lovelace");
    expect(homeAreaSchema.parse("  Makati City ")).toBe("Makati City");
  });

  it("enforces server-compatible lengths", () => {
    expect(() => passwordSchema.parse("too-short")).toThrow();
    expect(() => passwordSchema.parse("lowercaseonly123")).toThrow();
    expect(() => passwordSchema.parse("UPPERCASEONLY123")).toThrow();
    expect(() => passwordSchema.parse("NoDigitsPresent")).toThrow();
    expect(passwordSchema.parse("SecurePass123")).toBe("SecurePass123");
    expect(() => displayNameSchema.parse("A")).toThrow();
    expect(() => homeAreaSchema.parse(" ")).toThrow();
    expect(() => displayNameSchema.parse("x".repeat(81))).toThrow();
    expect(() => homeAreaSchema.parse("x".repeat(121))).toThrow();
  });
});
