const fs = require("node:fs");
const path = require("node:path");
const {
  checkUserProfile,
  checkUserRole,
  executeProvisioning,
  listAllUsers,
  parseArgs,
  planProvisioning,
  resolveEnvironment,
} = require("../provision-demo-environment.cjs");

describe("Operator Demo Provisioning Script", () => {
  const originalEnv = { ...process.env };
  const tempOutputDir = path.resolve(
    __dirname,
    "../../.codex-artifacts/test-artifacts",
  );
  const tempOutputFile = path.join(tempOutputDir, "demo-accounts.test.json");

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(tempOutputFile)) {
      fs.unlinkSync(tempOutputFile);
    }
    if (fs.existsSync(tempOutputDir)) {
      fs.rmdirSync(tempOutputDir);
    }
  });

  describe("parseArgs", () => {
    it("parses defaults safely without applying", () => {
      const args = parseArgs([]);
      expect(args.dryRun).toBe(true);
      expect(args.apply).toBe(false);
      expect(args.target).toBe("local");
      expect(args.workerEmail).toBe("demo-worker@dowell.local");
      expect(args.adminEmail).toBe("");
    });

    it("handles flags correctly", () => {
      const args = parseArgs([
        "--apply",
        "--hosted",
        "--admin-email",
        "admin@example.com",
        "--worker-email",
        "worker@example.com",
        "--worker-password",
        "CustomWorkerPass123!",
        "--worker-name",
        "Maria Santos",
        "--worker-area",
        "Quezon City",
      ]);

      expect(args.apply).toBe(true);
      expect(args.dryRun).toBe(false);
      expect(args.target).toBe("hosted");
      expect(args.adminEmail).toBe("admin@example.com");
      expect(args.workerEmail).toBe("worker@example.com");
      expect(args.workerPassword).toBe("CustomWorkerPass123!");
      expect(args.workerName).toBe("Maria Santos");
      expect(args.workerArea).toBe("Quezon City");
    });
  });

  describe("resolveEnvironment", () => {
    it("fails when hosted configuration is missing", async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      await expect(resolveEnvironment("hosted")).rejects.toThrow(
        /Hosted mode requires SUPABASE_URL/,
      );
    });

    it("resolves hosted configuration when environment is populated", async () => {
      process.env.SUPABASE_URL = "https://example.supabase.co/";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

      const env = await resolveEnvironment("hosted");
      expect(env.apiUrl).toBe("https://example.supabase.co");
      expect(env.serviceRoleKey).toBe("test-service-key");
    });
  });

  describe("listAllUsers & checks", () => {
    it("lists users with pagination termination", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: "u-1", email: "user1@example.com" }],
      });

      const users = await listAllUsers("http://local:55321", "key", mockFetch);
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe("u-1");
    });

    it("checks user role via rest endpoint", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ role: "admin" }],
      });

      const role = await checkUserRole(
        "http://local:55321",
        "key",
        "u-1",
        mockFetch,
      );
      expect(role).toBe("admin");
    });

    it("returns null if role is not present", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const role = await checkUserRole(
        "http://local:55321",
        "key",
        "u-1",
        mockFetch,
      );
      expect(role).toBeNull();
    });

    it("checks user profile via rest endpoint", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "u-1",
            display_name: "Test User",
            onboarding_completed_at: "2026-10-26T00:00:00Z",
          },
        ],
      });

      const profile = await checkUserProfile(
        "http://local:55321",
        "key",
        "u-1",
        mockFetch,
      );
      expect(profile.display_name).toBe("Test User");
    });
  });

  describe("planProvisioning", () => {
    it("plans admin role grant when admin user exists but has no role", async () => {
      const mockFetch = jest.fn((url) => {
        if (url.includes("/auth/v1/admin/users")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "admin-uuid", email: "owner@example.com" },
            ],
          });
        }
        if (url.includes("/rest/v1/account_roles")) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      });

      const plan = await planProvisioning(
        {
          apiUrl: "http://local:55321",
          serviceRoleKey: "key",
          adminEmail: "owner@example.com",
          workerEmail: "worker@example.com",
          workerPassword: "Pass",
          workerName: "Juan Dela Cruz",
          workerArea: "Sampaloc, Manila",
        },
        mockFetch,
      );

      expect(plan.admin.action).toBe("grant_admin_role");
      expect(plan.admin.userId).toBe("admin-uuid");
      expect(plan.worker.action).toBe("create_and_onboard");
    });

    it("plans no-op when admin already has admin role and worker is onboarded", async () => {
      const mockFetch = jest.fn((url) => {
        if (url.includes("/auth/v1/admin/users")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "admin-uuid", email: "owner@example.com" },
              { id: "worker-uuid", email: "worker@example.com" },
            ],
          });
        }
        if (url.includes("/rest/v1/account_roles")) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ role: "admin" }],
          });
        }
        if (url.includes("/rest/v1/profiles")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: "worker-uuid",
                display_name: "Juan Dela Cruz",
                home_area: "Manila",
                onboarding_completed_at: "2026-10-26T00:00:00Z",
              },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      const plan = await planProvisioning(
        {
          apiUrl: "http://local:55321",
          serviceRoleKey: "key",
          adminEmail: "owner@example.com",
          workerEmail: "worker@example.com",
          workerPassword: "Pass",
          workerName: "Juan Dela Cruz",
          workerArea: "Sampaloc, Manila",
        },
        mockFetch,
      );

      expect(plan.admin.action).toBe("none");
      expect(plan.admin.status).toBe("existing_admin");
      expect(plan.worker.action).toBe("none");
      expect(plan.worker.status).toBe("existing_onboarded");
    });
  });

  describe("executeProvisioning", () => {
    it("executes planned actions and writes sanitized summary file", async () => {
      const mockFetch = jest.fn((url) => {
        if (url.includes("/rest/v1/account_roles")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        if (url.includes("/auth/v1/admin/users")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: "new-worker-uuid" }),
          });
        }
        if (url.includes("/rest/v1/profiles")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const plan = {
        admin: {
          email: "owner@example.com",
          userId: "admin-uuid",
          action: "grant_admin_role",
          status: "pending",
        },
        worker: {
          email: "worker@example.com",
          userId: null,
          action: "create_and_onboard",
          workerPassword: "SuperSecretPassword123!",
          workerName: "Juan Dela Cruz",
          workerArea: "Sampaloc, Manila",
        },
      };

      const result = await executeProvisioning(
        {
          apiUrl: "http://local:55321",
          serviceRoleKey: "key",
          plan,
          outputFilePath: tempOutputFile,
        },
        mockFetch,
      );

      expect(result.admin.action).toBe("granted");
      expect(result.worker.action).toBe("created_and_onboarded");
      expect(result.worker.userId).toBe("new-worker-uuid");

      expect(fs.existsSync(tempOutputFile)).toBe(true);
      const savedData = JSON.parse(fs.readFileSync(tempOutputFile, "utf8"));
      expect(savedData.admin.email).toBe("owner@example.com");
      expect(savedData.worker.email).toBe("worker@example.com");
      expect(JSON.stringify(savedData)).not.toContain(
        "SuperSecretPassword123!",
      );
    });
  });
});
