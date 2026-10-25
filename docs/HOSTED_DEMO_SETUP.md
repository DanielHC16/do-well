# Hosted Demo Setup & Operator Provisioning Guide

This runbook guides operators through initializing, migrating, and provisioning the live Supabase environment for DO-WELL demonstrations, competition evaluations, and release acceptance.

---

## 1. Governance & Zero-Cost Compliance

- **External Spend**: Strictly **PHP 0 / USD 0**. No credit cards, billing accounts, expiring credits, or overage-incurring services may be added.
- **Credential Hygiene**: Privileged keys (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`) and OAuth client secrets must never be committed, logged, or exposed in `EXPO_PUBLIC_*` variables.
- **Principal Integrity**: A single user cannot apply to their own gig noticeboard posting (enforced at the database constraint level `P0005`). Demonstrating the end-to-end marketplace flow requires two distinct authenticated principals:
  - **Principal A (Owner / Admin)**: Acts as Employer in the marketplace and accesses the Admin Console.
  - **Principal B (Counterpart Worker)**: Acts as Worker in the marketplace.

---

## 2. Hosted Database Migration Parity

Before provisioning accounts, ensure the hosted database has applied all migrations through `20261026000100_admin_roles_and_reporting.sql`.

### Step 2.1: Pre-Migration Backup

Capture a timestamped snapshot of the current hosted schema and tables:

```powershell
# In ignored scratch directory
npx supabase db dump --linked -f .codex-artifacts/pre-parity-backup.sql
```

### Step 2.2: Dry Run and Apply

Verify migration diff and apply pending migrations to the linked project:

```powershell
# Review pending migrations
npx supabase migration list

# Push migrations to hosted project
npx supabase db push
```

### Step 2.3: Verify Remote RPC Availability

Verify that the new administrative and moderation RPCs are active in the hosted project:
- `get_my_capabilities()`
- `set_preferred_mode(text)`
- `submit_report(...)`
- `list_admin_reports(...)`
- `get_admin_report(uuid)`
- `resolve_report(...)`
- `get_admin_overview()`

---

## 3. Operator Provisioning Tool

The repository provides an idempotent, audited operator tool: `scripts/provision-demo-environment.mjs`.

### What the Tool Does
1. **Admin Authority**: Queries the Supabase Auth directory for the designated owner email, resolves the stable UUID, and idempotently grants the `admin` role in `public.account_roles`.
2. **Counterpart Worker**: Inspects the Auth directory for `demo-worker@dowell.local` (or a configured email). If absent, it creates the confirmed Auth user and onboards the profile (`display_name = 'Juan Dela Cruz'`, `home_area = 'Sampaloc, Manila'`).
3. **Artifact Summary**: Generates a sanitized account summary written to the ignored file `.codex-artifacts/demo-accounts.json`. Passwords and private tokens are excluded from disk output.

---

## 4. Running Provisioning

### Local Disposable Environment

To seed or verify against the local Docker Supabase stack:

```powershell
# Dry run inspection (no changes)
node scripts/provision-demo-environment.mjs --dry-run --local

# Apply provisioning to local instance
node scripts/provision-demo-environment.mjs --apply --local
```

### Hosted Production Project

Set environment variables in your secure operator session:

```powershell
$env:SUPABASE_URL = "https://<your-project-id>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<your-service-role-key>"
$env:DEMO_ADMIN_EMAIL = "<owner-google-account>@gmail.com"
```

Run dry run first:

```powershell
node scripts/provision-demo-environment.mjs --dry-run --hosted --admin-email $env:DEMO_ADMIN_EMAIL
```

Inspect output to ensure target user IDs match expectations. Then apply:

```powershell
node scripts/provision-demo-environment.mjs --apply --hosted --admin-email $env:DEMO_ADMIN_EMAIL
```

---

## 5. Live Demonstration Rehearsal

### Device 1: Owner / Employer / Admin
1. Open DO-WELL on Android physical device or primary emulator.
2. Sign in via Google using the designated owner account.
3. Observe header navigation:
   - Noticeboard top banner shows active neighborhood mode.
   - Header shows the **Admin Shield** button (`Admin Console`) and the **Settings Cog**.
4. Tap the Settings cog (`AccountSettingsScreen`) to confirm:
   - Workspace mode reflects `Employer` (or switch mode).
   - "Administrator Access Active" badge is displayed.
5. In Employer mode, create and publish a gig notice (e.g., *"Plumbing Repair - Leaking Pipe"*).

### Device 2: Counterpart Worker
1. Open DO-WELL on secondary emulator or browser session.
2. Sign in with the counterpart credentials (`demo-worker@dowell.local` / configured password).
3. Observe:
   - Header does **not** show the Admin Shield button.
   - Settings displays standard "Worker" status without admin capabilities.
4. On the Noticeboard, find the newly published plumbing gig.
5. Tap **Apply to Gig**, write a short application note, and submit.

### Joint Completion & Moderation Flow
1. **Device 1**: Open gig details, view applicants, and select the counterpart worker.
2. **Device 2**: In Worker Assignments, confirm the agreement, start the milestone, attach photo evidence, and submit work.
3. **Device 1**: Review the submission with image evidence and tap **Approve & Complete Work**.
4. **Device 2**: Tap **Report Issue** from assignment menu, submit a test report.
5. **Device 1**: Tap the Admin Shield in the top header, navigate to Reports Queue in `AdminConsoleScreen`, view the report details, and resolve with an audit note.

---

## 6. Disaster Recovery & Fallback

If network connectivity fails or hosted services become unreachable during an in-person evaluation, seamlessly pivot to the offline demo runtime as documented in `docs/DISASTER_RECOVERY.md`:

```powershell
# Set runtime to isolated offline demo
$env:EXPO_PUBLIC_APP_RUNTIME = "demo"
npx expo start
```

