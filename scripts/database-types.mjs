import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(projectRoot, "src", "types", "database.generated.ts");
const cliPath = join(
  projectRoot,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);
const checkOnly = process.argv.includes("--check");
const localDbUrl =
  process.env.SUPABASE_LOCAL_DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres";

const result = spawnSync(
  process.execPath,
  [
    cliPath,
    "gen",
    "types",
    "typescript",
    "--db-url",
    localDbUrl,
    "--schema",
    "public",
  ],
  {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || "Supabase type generation failed.\n");
  process.exit(result.status ?? 1);
}

const generated = result.stdout.replaceAll("\r\n", "\n");

if (!checkOnly) {
  writeFileSync(outputPath, generated, "utf8");
  process.stdout.write(`Generated ${outputPath}\n`);
  process.exit(0);
}

if (!existsSync(outputPath)) {
  process.stderr.write(`Missing generated database types: ${outputPath}\n`);
  process.exit(1);
}

const tracked = readFileSync(outputPath, "utf8").replaceAll("\r\n", "\n");

if (tracked !== generated) {
  process.stderr.write(
    "Generated database types are out of date. Run npm run db:types.\n",
  );
  process.exit(1);
}

process.stdout.write("Generated database types are current.\n");
