# Do Well

**Do Well** is an Android-first neighborhood gig marketplace designed for Philippine community conditions. It connects people offering short-term paid tasks with nearby or remote workers, with structured briefs, agreements, evidence submission and completion. It does not process payments or verify worker identity.

Built for the **UMAK IT Skills Olympics 2026**, Do Well follows a **PHP 0 / USD 0** external-service budget cap, with server authorization, local brief templates, weak-connectivity support and a standalone offline demo runtime.

---

For the current audit, emulator installation, standalone APKs and a rehearsable presentation, start with [the demo guide](docs/DEMO_GUIDE.md) and [readiness audit](docs/reports/2026-11-02-demo-readiness-audit.md). Hosted/device acceptance still has open checks in [#46](https://github.com/DanielHC16/do-well/issues/46).

## Implemented capabilities

1. **Dual-Mode Noticeboard Shell (M04)**:
   - Unified authenticated account supporting instant switching between **Employer** and **Worker** modes.
   - Accessible noticeboard with high-contrast UI, custom design tokens, and bottom tab navigation.
2. **Gig Creation & Management (M05)**:
   - Structured gig posting with strict domain validation across 8 categories, 3 work modes, budget limits, and area constraints.
   - Persistent local draft store surviving app restarts.
   - Security-definer SQL RPCs (`publish_gig`, `close_gig`) enforcing owner isolation and state machine integrity.
3. **Nearby Discovery & Explainable Ranking (M06, M11)**:
   - One-shot foreground-only GPS location with 5-second timeout (`expo-location`); zero background tracking.
   - Parameterized SQL RPC (`discover_gigs`) computing spherical Haversine distance bands (`< 5 km`, `< 15 km`) and explainable recommendation reasons.
   - Coarse public locality privacy masking: exact coordinates and addresses are never exposed to workers prior to agreement.
4. **Worker Applications & Atomic Selection (M07)**:
   - Worker bid submission with proposed rates and structured pitches.
   - Atomic database transaction (`select_worker_for_gig`) that accepts the winning worker, transitions gig status, and automatically closes competing applications.
5. **Agreements, Milestones & Activity Timeline (M08)**:
   - Contract locking with agreed rate, deliverables checklist, and milestone tracking.
   - Chronologically ordered audit trail (`activity_events`) recording all significant lifecycle events.
6. **Work Submission & Image Evidence (M09, M12)**:
   - Worker submission note with private photo evidence capture (`expo-image-picker`).
   - Private Supabase Storage bucket (`submission-evidence`) with client-side EXIF stripping, 5MB file cap, allowlisted image MIME types (JPEG, PNG, WEBP), and max 5 files.
   - Short-lived signed URLs for employer review; public read access is strictly forbidden by RLS.
7. **Local Notification Engine (M12)**:
   - On-device local notification dispatch (`expo-notifications`) across 3 configured Android channels (`assignment_updates`, `milestone_alerts`, `general_alerts`).
   - Deduplicated alerts derived from unread activity events; zero paid FCM or third-party push dependencies.
8. **Weak-Connectivity Resilience (M13)**:
   - Real-time network reachability detection via `expo-network`.
   - Global high-contrast amber `OfflineBanner` and `StaleDataBadge` showing snapshot timestamps.
   - User-scoped bounded read cache (`@dowell/cache/{userId}/{key}`) in AsyncStorage with 50-entry LRU cap and automatic purge on sign-out.
   - Persistent form draft stores for worker bids and evidence notes.
   - 12-second bounded mutation timeouts and reconciliation helpers to prevent duplicate server writes.
9. **Zero-Cost Brief Builder (M10)**:
   - Transforms unstructured employer task descriptions into structured, safety-checked job briefs.
   - Default operation uses a deterministic local template/rules engine without an external model provider. Present this as structured assistance, not demonstrated AI inference.
10. **Offline Demo Preview Mode (D01)**:
    - Self-contained offline demonstration sandbox using fictional personas (*Maya Santos* & *Alex Reyes*) and synthetic local data.
    - Zero network, Docker, or Supabase credentials required for judging.
    - Deterministic one-tap demo reset for repeatable live presentations.

---

## Repository & Budget Guardrails

- **Budget Cap**: Strictly **PHP 0 / USD 0**. No credit cards, billing accounts, or services that can generate automatic overage charges.
- **Secret Hygiene**: Zero tracked secrets in git or client bundles. All environment secrets are gitignored; only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are exposed to the client.
- **Database Security**: 100% of tables and storage objects are protected by PostgreSQL Row Level Security (RLS) and tested with pgTAP.

---

## Quality Gates & Verification Matrix

Historical milestone completion is recorded in the roadmap; it does not establish complete hosted authentication or physical-device acceptance. Run these checks on the current revision and consult the [session handoff](docs/SESSION_HANDOFF.md) for recorded results:

| Quality Gate | Command | Status |
| :--- | :--- | :--- |
| **Jest Test Suite** | `npm run test:run` | Unit/component/domain tests; excludes HTTP integration |
| **TypeScript** | `npm run typecheck` | Strict mobile typecheck; video composition is separate |
| **ESLint** | `npm run lint` | Mobile lint |
| **Prettier** | `npm run format:check` | Mobile/source formatting |
| **Expo Doctor** | `npx expo-doctor` | SDK compatibility |
| **Hermes Android Bundle** | `npx expo export --platform android` | Bundle compilation; not an APK |
| **Database Contract** | `npm run db:test` | Disposable local Supabase required |
| **HTTP integration** | `npm run test:auth:integration` | Separate local Auth/JWT and multi-principal workflows |

---

## Getting Started

### Prerequisites
- Node.js `22.23.2` (pinned in `.nvmrc`)
- npm `10.9.9` (pinned in `package.json#packageManager`)
- JDK 21 (this machine uses Android Studio's bundled JBR)
- Android SDK Platform 37, Build-Tools 37.0.0, CMake `3.31.6`
- Android emulator or USB-connected physical Android device

### Setup & Run
```powershell
# 1. Select Node version and install dependencies
nvm use 22.23.2
npm ci

# 2. Run verification gates
npm run typecheck
npm run test:run
npm run lint

# 3. Launch Android development build
npm run android
```

### Launch Offline Demo Preview (No Configuration Needed)
To run the fully functional offline demonstration without any backend or accounts:
```powershell
$env:EXPO_PUBLIC_APP_RUNTIME="demo"
npm run android
```
*(Clear `$env:EXPO_PUBLIC_APP_RUNTIME` to return to production mode).*

---

## Competition & Operations Runbooks

- **Competition Judging Script**: [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) — 3-5 minute live judging script and feature showcase.
- **Android Compilation & Checksum**: [`docs/COMPETITION_BUILD.md`](docs/COMPETITION_BUILD.md) — Release APK commands, apksigner, and checksum generation.
- **Disaster Recovery**: [`docs/DISASTER_RECOVERY.md`](docs/DISASTER_RECOVERY.md) — Presentation contingency matrix and database recovery procedures.
- **Implementation Roadmap**: [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md) — Milestone delivery history and verification proofs.
- **Session Handoff**: [`docs/SESSION_HANDOFF.md`](docs/SESSION_HANDOFF.md) — Detailed operational snapshot.
