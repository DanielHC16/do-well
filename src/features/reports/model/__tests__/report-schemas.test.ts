import { createReportInputSchema, reportRowSchema } from "../report-schemas";

describe("report-schemas", () => {
  const validUuid = "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d";

  describe("createReportInputSchema", () => {
    it("validates valid input with gigId", () => {
      const input = {
        category: "scam",
        details:
          "This gig asks for an upfront registration fee before starting work.",
        gigId: validUuid,
      };
      const result = createReportInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("validates valid input with profileId", () => {
      const input = {
        category: "harassment",
        details:
          "The employer made repeatedly inappropriate comments in person.",
        subjectProfileId: validUuid,
      };
      const result = createReportInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("validates valid input with assignmentId", () => {
      const input = {
        category: "unsafe",
        details:
          "The work site has exposed high-voltage wiring without safety equipment.",
        assignmentId: validUuid,
      };
      const result = createReportInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects invalid category", () => {
      const input = {
        category: "unsupported_category",
        details: "This gig asks for an upfront fee before starting work.",
        gigId: validUuid,
      };
      const result = createReportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects details shorter than 20 characters", () => {
      const input = {
        category: "scam",
        details: "Too short",
        gigId: validUuid,
      };
      const result = createReportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects details exceeding 2000 characters", () => {
      const input = {
        category: "scam",
        details: "A".repeat(2001),
        gigId: validUuid,
      };
      const result = createReportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects when no target identifier is provided", () => {
      const input = {
        category: "scam",
        details: "This gig asks for an upfront fee before starting work.",
      };
      const result = createReportInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("reportRowSchema", () => {
    it("parses database report row into domain Report", () => {
      const row = {
        id: validUuid,
        reporter_id: "b2c3d4e5-f6a7-4b2c-9d3e-4f5a6b7c8d9e",
        category: "scam",
        details: "This gig asks for an upfront fee before starting work.",
        status: "open",
        subject_profile_id: null,
        gig_id: validUuid,
        assignment_id: null,
        client_request_id: "c3d4e5f6-a7b8-4c3d-8e4f-5a6b7c8d9e0f",
        created_at: "2026-10-26T00:00:00Z",
        updated_at: "2026-10-26T00:00:00Z",
        reviewed_by: null,
        reviewed_at: null,
      };
      const parsed = reportRowSchema.parse(row);
      expect(parsed.id).toBe(validUuid);
      expect(parsed.category).toBe("scam");
      expect(parsed.status).toBe("open");
      expect(parsed.gigId).toBe(validUuid);
    });
  });
});
