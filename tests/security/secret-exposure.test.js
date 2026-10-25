const fs = require("fs");
const path = require("path");

describe("Security: Secret Exposure & Configuration Hygiene", () => {
  const repoRoot = path.resolve(__dirname, "../..");

  it("ensures .gitignore strictly ignores all environment and secret files", () => {
    const gitignorePath = path.join(repoRoot, ".gitignore");
    expect(fs.existsSync(gitignorePath)).toBe(true);

    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    expect(gitignore).toMatch(/\.env/);
    expect(gitignore).toMatch(/\.env\.\*/);
    expect(gitignore).toMatch(/\*\.pem/);
    expect(gitignore).toMatch(/\*\.jks/);
    expect(gitignore).toMatch(/\*\.keystore/);
  });

  it("ensures .env.example contains only public template variables and no actual credentials", () => {
    const envExamplePath = path.join(repoRoot, ".env.example");
    expect(fs.existsSync(envExamplePath)).toBe(true);

    const envExample = fs.readFileSync(envExamplePath, "utf8");
    // Should not contain real secrets or passwords
    expect(envExample).not.toMatch(/sb_publishable_[A-Za-z0-9_-]{20,}/);
    expect(envExample).not.toMatch(/sb_secret_[A-Za-z0-9_-]+/);
    expect(envExample).not.toMatch(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    );
    expect(envExample).not.toMatch(/password\s*=\s*[^\n]+/i);
    expect(envExample).toContain("EXPO_PUBLIC_SUPABASE_URL=");
    expect(envExample).toContain("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=");
  });

  it("ensures app.config.ts does not hardcode API secrets or passwords", () => {
    const appConfigPath = path.join(repoRoot, "app.config.ts");
    const appConfigContent = fs.readFileSync(appConfigPath, "utf8");

    expect(appConfigContent).not.toMatch(/secret/i);
    expect(appConfigContent).not.toMatch(/service_role/i);
    expect(appConfigContent).not.toMatch(/postgres:\/\//i);
    expect(appConfigContent).not.toMatch(/sb_secret/i);
  });

  it("ensures source tree code never accesses privileged server environment variables", () => {
    const forbiddenEnvAccessors = [
      "process.env.SUPABASE_SERVICE_ROLE_KEY",
      "process.env.SUPABASE_SECRET_KEY",
      "process.env.SUPABASE_SECREY_KEY",
      "process.env.SUPABASE_DB_PASSWORD",
      "process.env.GOOGLE_CLIENT_SECRET",
    ];

    const srcDir = path.join(repoRoot, "src");

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf8");
          for (const forbidden of forbiddenEnvAccessors) {
            expect(content).not.toContain(forbidden);
          }
        }
      }
    }

    scanDir(srcDir);
  });
});
