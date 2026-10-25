const fs = require("node:fs");
const path = require("node:path");

describe("CI workflow", () => {
  const workflow = fs.readFileSync(
    path.join(process.cwd(), ".github", "workflows", "ci.yml"),
    "utf8",
  );

  it.each([
    "node-version-file: .nvmrc",
    "npm ci",
    "npm run format:check",
    "npm run lint",
    "npm run typecheck",
    "npm run test:run",
    "npx expo-doctor",
    "npx expo export --platform android",
    "npm run db:reset",
    "npm run db:test",
    "npm run db:lint",
    "npm run db:types:check",
  ])("runs %s", (command) => {
    expect(workflow).toContain(command);
  });

  it("does not require hosted secrets for pull-request checks", () => {
    expect(workflow).not.toMatch(/secrets\./);
  });
});
