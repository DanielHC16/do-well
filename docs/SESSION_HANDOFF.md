# Session Handoff

## Snapshot

- **Last verified:** 2026-10-22 (Asia/Manila)
- **Phase:** M00 — repository security, architecture, roadmap, and GitHub workflow
- **Branch:** `docs/phase3-architecture`
- **Base/default branch:** `main`
- **Last committed revision:** `3af082b` (`chore(setup): secure repository bootstrap`)
- **Remote:** `https://github.com/DanielHC16/do-well`
- **Visibility:** `PRIVATE` (verified with GitHub CLI)
- **Current issue:** [#1 — M00 secure repository and approve Phase 3 architecture](https://github.com/DanielHC16/do-well/issues/1)
- **Milestone issues:** [#2](https://github.com/DanielHC16/do-well/issues/2) through [#15](https://github.com/DanielHC16/do-well/issues/15) track M01 through M14
- **Documentation PR:** not open yet; record its URL immediately after creation
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
- Phase 3 documentation is being created on this branch. No application packages, native projects, database migrations, or features were installed/implemented in this session.

The M00 issue and M01-M14 tracking issues exist. The documentation pull request is still pending creation; do not report it complete until its URL is recorded here.

## Current local tool evidence

| Tool | Observed | Readiness |
|---|---|---|
| Git | 2.45.1 | Ready |
| GitHub CLI | 2.102.0, authenticated sufficiently to inspect the private repo | Ready for approved repo operations |
| nvm-windows | 1.2.2 | Ready |
| Node.js | 22.12.0 | **Blocked for Expo SDK 58**; minimum is 22.13.x |
| npm | 10.9.0 | Update/pin during M01 |
| pnpm | 12.8.1 | Installed but not selected |
| Java runtime on PATH | Java 8 Oracle shim | **Misconfigured** |
| `javac` / `JAVA_HOME` | Eclipse Adoptium JDK 17.0.10 | Installed; PATH must align `java` |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk`, platforms through API 35 | Install Platform 37 for Expo SDK 58 |
| ADB | Exists under SDK `platform-tools`, absent from PATH | Add SDK paths during setup |
| `ANDROID_HOME` / `ANDROID_SDK_ROOT` | Unset | Set `ANDROID_HOME` |
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

## Immediate next actions for M00

1. Re-run documentation, link, staged-diff, ignore, and count-only secret-pattern verification.
2. Commit the Phase 3 documentation with a Conventional Commit and push `docs/phase3-architecture`.
3. Open the documentation PR to `main`, linking M00 issue #1; record the PR URL in this handoff and push that final handoff update.
4. Wait for the owner's approval. Do not merge substantive work automatically and do not start M01.

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

## Exact next milestone after approval

**M01 — Expo initialization, strict TypeScript/tooling, and first local Android development build.**

Start only after the documentation PR is approved/merged and the competition framework gate is accepted. Use branch `chore/expo-initialization`; follow `SETUP_GUIDE.md`; create no product feature. M01 is done only when the pinned toolchain passes, CI scripts exist, an APK installs/launches on the named physical device, and no secret is present in Git or the public Expo config.

## Stop conditions

Stop and update the issue/handoff instead of improvising if a step asks for billing, a paid plan, a privileged key in client code, destructive database action, history rewrite, production deployment, automatic merge, or unapproved feature implementation.
