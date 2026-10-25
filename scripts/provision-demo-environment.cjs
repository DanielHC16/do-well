const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    dryRun: true,
    target: "local",
    adminEmail: process.env.DEMO_ADMIN_EMAIL || "",
    workerEmail: process.env.DEMO_WORKER_EMAIL || "demo-worker@dowell.local",
    workerPassword:
      process.env.DEMO_WORKER_PASSWORD || "DowellWorker!2026PassSafe",
    workerName: "Juan Dela Cruz",
    workerArea: "Sampaloc, Manila",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      args.apply = true;
      args.dryRun = false;
    } else if (arg === "--dry-run") {
      args.apply = false;
      args.dryRun = true;
    } else if (arg === "--hosted") {
      args.target = "hosted";
    } else if (arg === "--local") {
      args.target = "local";
    } else if (arg === "--admin-email" && i + 1 < argv.length) {
      args.adminEmail = argv[++i].trim();
    } else if (arg === "--worker-email" && i + 1 < argv.length) {
      args.workerEmail = argv[++i].trim();
    } else if (arg === "--worker-password" && i + 1 < argv.length) {
      args.workerPassword = argv[++i].trim();
    } else if (arg === "--worker-name" && i + 1 < argv.length) {
      args.workerName = argv[++i].trim();
    } else if (arg === "--worker-area" && i + 1 < argv.length) {
      args.workerArea = argv[++i].trim();
    }
  }

  return args;
}

async function resolveEnvironment(target) {
  if (target === "hosted") {
    const apiUrl =
      process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!apiUrl || !serviceRoleKey) {
      throw new Error(
        "Hosted mode requires SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }

    return { apiUrl: apiUrl.replace(/\/+$/, ""), serviceRoleKey };
  }

  const { loadLocalSupabaseEnvironment } = require("./local-supabase-env.cjs");
  const localEnv = await loadLocalSupabaseEnvironment();
  return {
    apiUrl: localEnv.apiUrl.replace(/\/+$/, ""),
    serviceRoleKey: localEnv.serviceRoleKey,
  };
}

function adminHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function listAllUsers(apiUrl, serviceRoleKey, fetchFn = fetch) {
  const users = [];
  let page = 1;
  const perPage = 50;

  while (page <= 20) {
    const res = await fetchFn(
      `${apiUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      {
        headers: adminHeaders(serviceRoleKey),
      },
    );

    if (!res.ok) {
      throw new Error(
        `Failed to query Auth admin users: HTTP ${res.status} ${res.statusText}`,
      );
    }

    const data = await res.json();
    const batch = Array.isArray(data)
      ? data
      : Array.isArray(data?.users)
        ? data.users
        : [];
    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

async function checkUserRole(apiUrl, serviceRoleKey, userId, fetchFn = fetch) {
  const res = await fetchFn(
    `${apiUrl}/rest/v1/account_roles?user_id=eq.${encodeURIComponent(userId)}&select=role`,
    {
      headers: adminHeaders(serviceRoleKey),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Failed to check account role: HTTP ${res.status} ${res.statusText}`,
    );
  }

  const rows = await res.json();
  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0].role;
  }
  return null;
}

async function checkUserProfile(
  apiUrl,
  serviceRoleKey,
  userId,
  fetchFn = fetch,
) {
  const res = await fetchFn(
    `${apiUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,display_name,home_area,onboarding_completed_at,preferred_mode`,
    {
      headers: adminHeaders(serviceRoleKey),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Failed to check profile: HTTP ${res.status} ${res.statusText}`,
    );
  }

  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function planProvisioning(
  {
    apiUrl,
    serviceRoleKey,
    adminEmail,
    workerEmail,
    workerPassword,
    workerName,
    workerArea,
  },
  fetchFn = fetch,
) {
  const users = await listAllUsers(apiUrl, serviceRoleKey, fetchFn);

  let adminPlan = {
    email: adminEmail,
    status: "not_found",
    userId: null,
    action: "none",
  };

  if (adminEmail) {
    const adminUser = users.find(
      (u) => u.email?.toLowerCase() === adminEmail.toLowerCase(),
    );
    if (adminUser) {
      const existingRole = await checkUserRole(
        apiUrl,
        serviceRoleKey,
        adminUser.id,
        fetchFn,
      );
      if (existingRole === "admin") {
        adminPlan = {
          email: adminEmail,
          status: "existing_admin",
          userId: adminUser.id,
          action: "none",
        };
      } else {
        adminPlan = {
          email: adminEmail,
          status: "user_found_role_missing",
          userId: adminUser.id,
          action: "grant_admin_role",
        };
      }
    } else {
      adminPlan = {
        email: adminEmail,
        status: "user_not_found",
        userId: null,
        action: "require_user_login",
      };
    }
  }

  let workerPlan = {
    email: workerEmail,
    status: "not_found",
    userId: null,
    action: "create_and_onboard",
    workerPassword,
    workerName,
    workerArea,
  };

  const workerUser = users.find(
    (u) => u.email?.toLowerCase() === workerEmail.toLowerCase(),
  );
  if (workerUser) {
    const profile = await checkUserProfile(
      apiUrl,
      serviceRoleKey,
      workerUser.id,
      fetchFn,
    );
    if (profile?.onboarding_completed_at) {
      workerPlan = {
        email: workerEmail,
        status: "existing_onboarded",
        userId: workerUser.id,
        action: "none",
        workerName: profile.display_name,
        workerArea: profile.home_area,
      };
    } else {
      workerPlan = {
        email: workerEmail,
        status: "existing_not_onboarded",
        userId: workerUser.id,
        action: "onboard_profile",
        workerName,
        workerArea,
      };
    }
  }

  return { admin: adminPlan, worker: workerPlan };
}

async function executeProvisioning(
  {
    apiUrl,
    serviceRoleKey,
    plan,
    outputFilePath = path.join(
      repoRoot,
      ".codex-artifacts",
      "demo-accounts.json",
    ),
  },
  fetchFn = fetch,
) {
  const result = {
    executedAt: new Date().toISOString(),
    admin: { ...plan.admin },
    worker: { ...plan.worker },
  };

  if (plan.admin.action === "grant_admin_role" && plan.admin.userId) {
    const res = await fetchFn(`${apiUrl}/rest/v1/account_roles`, {
      method: "POST",
      headers: {
        ...adminHeaders(serviceRoleKey),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: plan.admin.userId,
        role: "admin",
        granted_by: plan.admin.userId,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to grant admin role: HTTP ${res.status} ${res.statusText}`,
      );
    }
    result.admin.action = "granted";
    result.admin.status = "admin";
  }

  if (plan.worker.action === "create_and_onboard") {
    const createRes = await fetchFn(`${apiUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders(serviceRoleKey),
      body: JSON.stringify({
        email: plan.worker.email,
        password: plan.worker.workerPassword,
        email_confirm: true,
        user_metadata: {
          display_name: plan.worker.workerName,
        },
      }),
    });

    if (!createRes.ok) {
      throw new Error(
        `Failed to create worker auth user: HTTP ${createRes.status} ${createRes.statusText}`,
      );
    }

    const createdUserData = await createRes.json();
    const workerId = createdUserData.id || createdUserData.user?.id;
    result.worker.userId = workerId;

    const profileRes = await fetchFn(
      `${apiUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(workerId)}`,
      {
        method: "PATCH",
        headers: adminHeaders(serviceRoleKey),
        body: JSON.stringify({
          display_name: plan.worker.workerName,
          home_area: plan.worker.workerArea,
          preferred_mode: "worker",
          onboarding_completed_at: new Date().toISOString(),
        }),
      },
    );

    if (!profileRes.ok) {
      throw new Error(
        `Failed to update worker profile: HTTP ${profileRes.status} ${profileRes.statusText}`,
      );
    }

    result.worker.action = "created_and_onboarded";
    result.worker.status = "ready";
  } else if (plan.worker.action === "onboard_profile" && plan.worker.userId) {
    const profileRes = await fetchFn(
      `${apiUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(plan.worker.userId)}`,
      {
        method: "PATCH",
        headers: adminHeaders(serviceRoleKey),
        body: JSON.stringify({
          display_name: plan.worker.workerName,
          home_area: plan.worker.workerArea,
          preferred_mode: "worker",
          onboarding_completed_at: new Date().toISOString(),
        }),
      },
    );

    if (!profileRes.ok) {
      throw new Error(
        `Failed to onboard worker profile: HTTP ${profileRes.status} ${profileRes.statusText}`,
      );
    }

    result.worker.action = "onboarded";
    result.worker.status = "ready";
  }

  const outDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(
    outputFilePath,
    JSON.stringify(
      {
        generated_at: result.executedAt,
        admin: {
          email: result.admin.email,
          user_id: result.admin.userId,
          status: result.admin.status,
        },
        worker: {
          email: result.worker.email,
          user_id: result.worker.userId,
          display_name: result.worker.workerName,
          home_area: result.worker.workerArea,
          status: result.worker.status,
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  return result;
}

async function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const env = await resolveEnvironment(args.target);

  const plan = await planProvisioning({
    apiUrl: env.apiUrl,
    serviceRoleKey: env.serviceRoleKey,
    adminEmail: args.adminEmail,
    workerEmail: args.workerEmail,
    workerPassword: args.workerPassword,
    workerName: args.workerName,
    workerArea: args.workerArea,
  });

  if (args.dryRun) {
    process.stdout.write(
      `[dry-run] Target: ${args.target} (${env.apiUrl})\n` +
        `[dry-run] Admin (${plan.admin.email || "none specified"}): status=${plan.admin.status}, action=${plan.admin.action}\n` +
        `[dry-run] Worker (${plan.worker.email}): status=${plan.worker.status}, action=${plan.worker.action}\n` +
        `[dry-run] No changes applied. Run with --apply to execute.\n`,
    );
    return { planned: true, applied: false, plan };
  }

  const execution = await executeProvisioning({
    apiUrl: env.apiUrl,
    serviceRoleKey: env.serviceRoleKey,
    plan,
  });

  process.stdout.write(
    `[applied] Target: ${args.target} (${env.apiUrl})\n` +
      `[applied] Admin: status=${execution.admin.status}, action=${execution.admin.action}\n` +
      `[applied] Worker: status=${execution.worker.status}, action=${execution.worker.action}\n` +
      `[applied] Summary written to .codex-artifacts/demo-accounts.json\n`,
  );

  return { planned: true, applied: true, execution };
}

module.exports = {
  parseArgs,
  resolveEnvironment,
  listAllUsers,
  checkUserRole,
  checkUserProfile,
  planProvisioning,
  executeProvisioning,
  runCli,
};
