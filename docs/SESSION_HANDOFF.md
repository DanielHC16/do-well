# Session Handoff

## Snapshot

- **Last verified:** 2026-10-22 (Asia/Manila)
- **Phase:** M01 — Expo initialization and Android development proof
- **Branch:** `chore/expo-initialization`
- **Base/default branch:** `main`
- **Architecture baseline revision:** `5dece87` (`docs(architecture): define phase 3 system design`)
- **Remote:** `https://github.com/DanielHC16/do-well`
- **Visibility:** `PRIVATE` (verified with GitHub CLI)
- **Current issue:** [#2 — M01 Initialize Expo and prove Android development](https://github.com/DanielHC16/do-well/issues/2)
- **Milestone issues:** [#2](https://github.com/DanielHC16/do-well/issues/2) through [#15](https://github.com/DanielHC16/do-well/issues/15) track M01 through M14
- **Documentation PR:** [#16 — docs(architecture): define Phase 3 system design](https://github.com/DanielHC16/do-well/pull/16) — merged
- **Application implementation:** not started

This file records repository evidence, not chat state. Re-run the commands below because documentation is being authored concurrently and working-tree details can change after this snapshot.

## Completed and verified

- The initial repository bootstrap exists on `main`.
- The current planning branch is `docs/phase3-architecture`.
- GitHub remote `origin` points to `DanielHC16/do-well`; GitHub reports the repository private and default branch `main`.
- `.gitignore` excludes `.env*` except templates, OAuth/service-account downloads, signing material, local Android configuration, Supabase function secrets, dependencies, Expo/native output, APK/AAB files, caches, and logs.
- `.env.example` contains only public Supabase URL/publishable-key placeholders and warnings against privileged values.
- Existing credential files were preserved. This documentation agent did not open or print their contents.
- Workspace skills/agent configuration was already synchronized; no sync was run.
- Fourteen requested labels plus one issue for each M00-M14 milestone exist in the private GitHub repository.
- The delegated read-only reviewer pass completed. Its material findings were resolved in the documentation: the evidence-submission transaction, zero-cost GitHub Actions gate, Expo/Jest test stack, SDK 58 New Architecture guidance, reset-password route, label taxonomy, shared-directory layout, and handoff state now agree across documents.
- Phase 3 documentation is merged. M01 Task 1 installed no application packages, native projects, database migrations, or product features.

The M00 architecture PR was approved and merged. M01 Task 1 corrected the supported local toolchain; later M01 tasks remain in progress.

## Current local tool evidence

| Tool | Observed | Readiness |
|---|---|---|
| Git | 2.45.1 | Ready |
| GitHub CLI | 2.102.0, authenticated sufficiently to inspect the private repo | Ready for approved repo operations |
| nvm-windows | 1.2.2 | Ready |
| Node.js | 22.23.2 selected through nvm-windows 1.2.2 | Ready; pinned in `.nvmrc` |
| npm | 10.9.9 | Ready; `packageManager` pin follows with the scaffold |
| pnpm | 12.8.1 | Installed but not selected |
| Java runtime/compiler | Eclipse Temurin JDK 17.0.10 in the corrected shell | User `JAVA_HOME`/PATH aligned; machine PATH still contains an earlier Oracle Java 8 shim that requires administrator cleanup |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk`; Platform 37.0 and Build-Tools 37.0.0 installed | Ready |
| ADB | 1.0.41 / Platform-Tools 35.0.2; added to user PATH | Ready; `adb devices -l` returned no attached device |
| `ANDROID_HOME` | Set at user scope to `%LOCALAPPDATA%\Android\Sdk` | Ready |
| Expo app/lockfile | None | Deliberately deferred to M01 |

The exact non-destructive setup plan is in `SETUP_GUIDE.md`.

## Architecture decisions relevant to continuation

- Android/Expo development build, TypeScript, Expo Router, Supabase Auth/Postgres/RLS/private Storage remain confirmed.
- Nearby discovery is list-first and map-independent. Google Maps/billing is prohibited.
- MapLibre is only a renderer candidate; an interactive map is blocked until a tile/style provider passes license, no-card, hard-quota, attribution, caching, and outage review.
- P0 requests foreground/approximate location in context and always provides manual locality.
- P0 uses private image evidence and an in-app activity center plus local notifications. FCM/Expo remote push is optional and must remain on Firebase Spark/no billing.
- Offline levels are separate: cached reads (L1), drafts/explicit pending actions (L2), and reliable background synchronization (L3). L3 is deferred.
- Supabase and Expo Free are hard-capped operating dependencies with documented recovery/fallback; no paid upgrade is an acceptable incident response.
- AI is not selected. A real-inference hardware/network feasibility experiment must pass before an AI claim; manual brief creation remains available.

## M01 Task 1 evidence and next actions

1. Node `v22.23.2` and npm `10.9.9` are selected; `.nvmrc` records the Node pin.
2. Official Android Platform 37.0 and Build-Tools 37.0.0 are installed and Android SDK licenses are accepted.
3. User `JAVA_HOME`, `ANDROID_HOME`, and PATH entries are configured from verified installed directories.
4. Before device-build acceptance, remove/reorder the machine-wide Oracle Java 8 shim, open a fresh terminal, and prove both `java` and `javac` resolve to JDK 17.
5. Connect and authorize the intended physical Android phone; no device was present during Task 1.
6. Continue with M01 Task 2: generate and inspect the Expo SDK 58 scaffold in a checked temporary directory.

Suggested verification:

```powershell
git status --short --branch
git diff --check
git diff --name-status main...HEAD
git remote -v
gh repo view DanielHC16/do-well --json nameWithOwner,visibility,defaultBranchRef,url
gh pr list --repo DanielHC16/do-well --state all
gh issue list --repo DanielHC16/do-well --state all
```

For uncommitted documentation, also inspect `git diff --no-index -- NUL <file>` or the editor preview; `main...HEAD` does not include uncommitted files.

## Blockers and decisions still needed

- Official UMAK 2026 eligibility/mechanics: Expo/React Native acceptance, deadline, submission package, judging device/API, demo duration, and network conditions.
- Physical Android test device model and Android/API version.
- Phase 2 final UI/wireframes.
- Product rules before schema freeze: pilot radius, categories/prohibited work, mutual agreement, cancellation/disputes, evidence retention, and moderation process.
- Supabase dashboard state and final owner-controlled Auth/redirect settings.
- Expo/EAS account or organization ownership.
- GitHub Actions billing guard: verify no valid payment method or configure an enforced zero-dollar stop-usage budget before adding hosted workflows; local checks remain authoritative meanwhile.
- AI benchmark hardware, candidate model/license, secured laptop-to-phone network design, and measurable success thresholds.
- Map tile/style source if an interactive map remains desired. The list experience is not blocked.
- Remote push decision. Local notifications/activity center are not blocked.

## Exact next task

**M01 Task 2 — generate and review the Expo SDK 58 scaffold.**

Continue on `chore/expo-initialization`; follow `SETUP_GUIDE.md`; create no product feature. M01 is done only when the pinned toolchain passes, CI scripts exist, an APK installs/launches on the named physical device, and no secret is present in Git or the public Expo config.

## Stop conditions

Stop and update the issue/handoff instead of improvising if a step asks for billing, a paid plan, a privileged key in client code, destructive database action, history rewrite, production deployment, automatic merge, or unapproved feature implementation.
