import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cjs = require("./provision-demo-environment.cjs");

export const {
  parseArgs,
  resolveEnvironment,
  listAllUsers,
  checkUserRole,
  checkUserProfile,
  planProvisioning,
  executeProvisioning,
  runCli,
} = cjs;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cjs.runCli().catch((err) => {
    process.stderr.write(`Provisioning failed: ${err.message}\n`);
    process.exit(1);
  });
}
