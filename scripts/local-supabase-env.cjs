const { execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const expectedApiUrl = "http://127.0.0.1:55321";

function parseEnvironment(output) {
  const entries = new Map();

  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(?:"([^"]*)"|(.*))$/.exec(line.trim());
    if (match) {
      entries.set(match[1], match[2] ?? match[3] ?? "");
    }
  }

  return entries;
}

async function loadLocalSupabaseEnvironment() {
  const cliPath = path.join(
    process.cwd(),
    "node_modules",
    "supabase",
    "dist",
    "supabase.js",
  );

  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      process.execPath,
      [cliPath, "status", "-o", "env"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
        windowsHide: true,
      },
    ));
  } catch {
    throw new Error("Unable to read the disposable local Supabase environment");
  }

  const environment = parseEnvironment(stdout);
  const apiUrl = environment.get("API_URL");
  const publishableKey = environment.get("PUBLISHABLE_KEY");
  const serviceRoleKey = environment.get("SERVICE_ROLE_KEY");

  if (apiUrl !== expectedApiUrl || !publishableKey || !serviceRoleKey) {
    throw new Error(
      "Local Supabase environment is missing required safe test values",
    );
  }

  return Object.freeze({ apiUrl, publishableKey, serviceRoleKey });
}

module.exports = { loadLocalSupabaseEnvironment };
