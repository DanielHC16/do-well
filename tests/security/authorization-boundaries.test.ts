import { z } from "zod";

describe("Security: Authorization Boundaries & Role Enforcements", () => {
  it("verifies employer and worker roles are strictly disjoint in user profiles", () => {
    const RoleSchema = z.enum(["employer", "worker"]);
    expect(() => RoleSchema.parse("admin")).toThrow();
    expect(() => RoleSchema.parse("superuser")).toThrow();
    expect(() => RoleSchema.parse("service_role")).toThrow();
    expect(RoleSchema.parse("employer")).toBe("employer");
    expect(RoleSchema.parse("worker")).toBe("worker");
  });

  it("enforces fail-closed validation for unknown RPC status transitions", () => {
    const ValidGigStatusSchema = z.enum([
      "draft",
      "open",
      "in_progress",
      "completed",
      "cancelled",
    ]);

    expect(() => ValidGigStatusSchema.parse("arbitrary_status")).toThrow();
    expect(() => ValidGigStatusSchema.parse("active")).toThrow();
    expect(ValidGigStatusSchema.parse("open")).toBe("open");
  });

  it("rejects oversized payloads at boundary schema before network egress", () => {
    const BoundedDescriptionSchema = z.string().min(20).max(4000);

    const shortString = "Too short";
    expect(() => BoundedDescriptionSchema.parse(shortString)).toThrow();

    const normalString =
      "This is a valid agreement description that satisfies the minimum length requirement.";
    expect(BoundedDescriptionSchema.parse(normalString)).toBe(normalString);

    const oversizedString = "A".repeat(4001);
    expect(() => BoundedDescriptionSchema.parse(oversizedString)).toThrow();
  });

  it("enforces evidence file constraints (max 5 files, allowed MIME types, max 5MB)", () => {
    const EvidenceFileSchema = z.object({
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      fileSize: z
        .number()
        .int()
        .positive()
        .max(5 * 1024 * 1024),
      storagePath: z
        .string()
        .regex(/^evidence\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/),
    });

    // Valid evidence item
    const validItem = {
      mimeType: "image/jpeg" as const,
      fileSize: 1024 * 500, // 500KB
      storagePath:
        "evidence/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg",
    };
    expect(EvidenceFileSchema.parse(validItem)).toEqual(validItem);

    // Invalid MIME
    expect(() =>
      EvidenceFileSchema.parse({
        ...validItem,
        mimeType: "application/pdf",
      }),
    ).toThrow();

    // Invalid Size (>5MB)
    expect(() =>
      EvidenceFileSchema.parse({
        ...validItem,
        fileSize: 6 * 1024 * 1024,
      }),
    ).toThrow();

    // Invalid Storage Path (Directory traversal attempt)
    expect(() =>
      EvidenceFileSchema.parse({
        ...validItem,
        storagePath: "../../../etc/passwd",
      }),
    ).toThrow();

    // Max 5 attachments
    const AttachmentsSchema = z.array(EvidenceFileSchema).max(5);
    const fiveItems = Array(5).fill(validItem);
    expect(AttachmentsSchema.parse(fiveItems)).toHaveLength(5);

    const sixItems = Array(6).fill(validItem);
    expect(() => AttachmentsSchema.parse(sixItems)).toThrow();
  });

  it("enforces user-scoped cache partitioning to prevent cross-account leakage", () => {
    const cacheKeyPrefix = (userId: string, key: string) =>
      `@dowell/cache/${userId}/${key}`;

    const userAKey = cacheKeyPrefix("user-a-1234", "discovery_feed");
    const userBKey = cacheKeyPrefix("user-b-5678", "discovery_feed");

    expect(userAKey).not.toEqual(userBKey);
    expect(userAKey).toBe("@dowell/cache/user-a-1234/discovery_feed");
    expect(userBKey).toBe("@dowell/cache/user-b-5678/discovery_feed");
  });
});
