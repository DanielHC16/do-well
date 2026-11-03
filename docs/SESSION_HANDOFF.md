# Session Handoff

## Offline complete-cycle repair — 2026-11-03 — in progress

Owner requested final-app presentation for the offline APK, automatic counterpart responses, Settings-only account switching, and recovery from Applied. Branch `fix/demo-complete-cycle`, issue [#49](https://github.com/DanielHC16/do-well/issues/49). Scope/acceptance: [plan](plans/2026-11-03-demo-complete-cycle.md); architecture and explicit owner supersession of older on-screen disclosure requirements: [ADR 0010](adr/0010-offline-demo-counterpart-progression.md). No live runtime, hosted operations, schema, credentials, paid service or video changes. Build and verification remain pending until this section and the demo guide record fresh evidence. The live binary remains unchanged.

## Shareable APK folder — 2026-11-03

The owner explicitly requested a root `do-well-apk/` folder, both binaries committed and pushed directly to `main`, and a complete README emulator/USB-phone guide. This distribution-only follow-up is an owner-authorized exception to the normal PR path and to ignoring APKs. The two verified APKs are copied unchanged from local staging: `do-well-apk/do-well-live.apk` and `do-well-apk/do-well-demo-offline.apk`, each 60,496,430 bytes. Their SHA-256 values match [DEMO_GUIDE.md](DEMO_GUIDE.md); signature/privacy checks pass on both copied files. Only those two filenames are allowlisted; generated APKs, keys, credentials and `.codex-artifacts/` remain ignored. No app source, native project, signing or video change is made. The README contains complete standalone emulator and USB-phone installation steps; physical-phone acceptance remains #46. Earlier statements that all APKs are uncommitted describe the prior distribution policy and are superseded by this explicit request.

Fresh distribution checks: both copied APK signatures and privacy/ABI scans pass; hashes match the previously installed/rehearsed builds, four secret-exposure tests pass, README Prettier and local links pass, and `git diff --check` passes. No phone or emulator was connected during this documentation/copy follow-up; earlier device acceptance evidence remains in the demo guide.

## App and demo preparation — 2026-11-03

The owner renewed authorization to finish functional demo/live APKs, commit, and merge the app repair; video generation is explicitly outside the current task. PR [#45](https://github.com/DanielHC16/do-well/pull/45) already merged at `1515b1b`. The cohesive app repair is [PR #48](https://github.com/DanielHC16/do-well/pull/48), tracked by [#47](https://github.com/DanielHC16/do-well/issues/47); use its GitHub state as the integration record. Earlier dated sections below are historical checkpoints, not current instructions.

Both PR #48 review findings are corrected: scoped TanStack Query replaces manual capability fetching; successful moderation refetches overview and page one so report 21 replenishes the queue. Failed refresh is distinguished from an already-saved decision and hides stale moderation actions. The pinned JS-only dependency, account isolation and no-persisted-authority boundary are recorded in [ADR 0009](adr/0009-scoped-account-server-state.md). Fresh final verification: formatting, lint, strict TypeScript, **115 suites / 718 tests**, Expo Doctor **20/20**, Android Hermes export **5.3MB**; independent final review: LGTM. Both standalone APKs were built from frozen app source `67b6c77`, with matching 203-file source manifests; later integration changes are documentation only. APK artifact, signature, privacy, checksum, emulator installation and rehearsal evidence is maintained in [DEMO_GUIDE.md](DEMO_GUIDE.md).

The live APK uses the current marketplace and requires internet plus prepared separate accounts. The offline APK uses fictional Maya/Alex and a separate local sandbox. Both share one package and replace one another on one device; neither needs Metro. Follow [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md). All builds are local and zero-cost; development signing is for controlled sideloading. No phone is connected, so physical-device acceptance remains unverified.

Both final APKs passed v2 signature, ARM64/x86_64 archive, embedded-bundle and private-value checks. On the new isolated API35 AVD `do_well_demo_api35`, both installed successfully and cold-launched without Metro (offline3.067s/live3.858s). With airplane mode on and Wi-Fi/mobile data off, a newly posted fictional gig completed application, selection, text submission, approval and reset; the completion timeline was inspected. With connectivity restored, the live APK signed in the existing authorized employer by email/password, loaded redesigned Home and Profile→Settings, saved a server-backed workspace default and restored its original value. Both rehearsal processes exited0; guide records hashes/logs/screenshots. The new AVD has8GB data storage; the old `medium_phone` lacked staging space and retains its apps/sessions/drafts. The prepared emulator is left on the live APK, online and signed in. Source CI run `41586631382` passed app/database/security checks; the PR records final documentation-head checks and merge state.

Issue #4's completed M03A foundation is closed; remaining hosted auth/physical-device/GPS/photo acceptance stays open in [#46](https://github.com/DanielHC16/do-well/issues/46). No fresh local HTTP integration success is claimed because Docker is unavailable. Preserve the owner's pre-existing `.gitignore` and `expo-env.d.ts` modifications. Secrets, credentials, generated native output and APKs remain ignored. No schema, hosted provisioning, privilege, paid-service or video change belongs to this follow-up.

## Demo-readiness repair — 2026-11-02

- PR [#45](https://github.com/DanielHC16/do-well/pull/45) is merged to main at `1515b1b`, after fully green app/database/security CI run `41474062126` and resolved review findings. Owner authorized the merge in this session.
- Follow-up branch: `fix/demo-readiness`, from that merge; scope tracked by [#47](https://github.com/DanielHC16/do-well/issues/47). Restores protected Settings/Admin routes, schema-validated existing RPC gateways, fail-closed capability loading/retry and account isolation. Settings uses the server's default workspace; startup hydrates it with bounded per-user offline preference fallback. Failed local activation is reported honestly. Moderation UI matches server's ten-character note minimum.
- Test-first defects and independent review findings are resolved. Fresh full verification on the combined source: formatting, ESLint, strict TypeScript, **114 suites / 713 tests**, Expo Doctor **20/20**, Android Hermes export **1,735 modules / 5.2MB**. Focused route/gateway/settings/admin/store/provider verification: **7 suites / 34 tests**. Independent final re-review: LGTM.
- Local standalone demo/live APK builds are in progress. SDK patch alignment and generated Android regeneration are complete; Java17 toolchain is cached, Gradle runs on JBR21. A native NDK-header access failure was reproduced as readable/compilable in isolation; retry runs without competing Metro/Jest jobs. Do not claim an APK until the demo guide records signature/hash/install/launch evidence. No physical phone is connected.
- [Demo guide](DEMO_GUIDE.md), [presentation script](DEMO_RUNBOOK.md), [readiness audit](reports/2026-11-02-demo-readiness-audit.md) and README now distinguish live authenticated use from the separate visibly synthetic offline runtime. No sign-in Demo Preview switch, ratings, automatic offline-write synchronization, payment integration or proven default model inference is promised.
- Issue #4 closed as completed M03A foundation after remaining hosted/device acceptance transferred to [#46](https://github.com/DanielHC16/do-well/issues/46). No new local HTTP integration run: Docker engine is unavailable. Existing owner edits to `.gitignore` and `expo-env.d.ts` remain preserved and uncommitted. No schema, hosted provisioning, capability grant, billing/card or paid build service change.

## Verified current work — 2026-11-02

The owner authorized fixing the latest PR, issue closeout, merging to main, and a zero-cost demo APK. GitHub CLI and connector access are working. PR #44 (redesign) is merged at `2078bca`; the current open PR is [#45](https://github.com/DanielHC16/do-well/pull/45), `feat/competition-video-production`, including assignment-detail snake_case parsing fix `6dffca3` and video workspace `93082f0`.

PR #45 review's fresh-checkout subtitle-directory failure was reproduced with a failing regression and fixed. Mobile TypeScript now excludes the independent video project; root CI installs only mobile dependencies. A second review identified short unmeasured draft padding; its426s regression failed with timeline-bounds error, then passed after consistent last-chapter padding. Fresh focused verification:2 suites/26 tests pass (preparation + assignment gateway); mobile typecheck and lint passed. Independent re-review: LGTM. Remote full checks remain the merge gate. Existing owner edits to `.gitignore` and `expo-env.d.ts` remain uncommitted and must be preserved.

Issue [#4](https://github.com/DanielHC16/do-well/issues/4) is closed for completed M03A scope after transferring the entire unfinished hosted/device acceptance checklist to [#46](https://github.com/DanielHC16/do-well/issues/46). This is a tracking split, not a claim of M03B completion. Later 1 November video checkpoint records two hosted test identities and real app footage; older claims that no hosted rehearsal occurred are superseded. GPS/photo/auth/device matrix remain incomplete.

Demo-readiness follow-up is being prepared separately: restore missing Settings/Admin routes and existing server-backed integrations, correct misleading demo instructions, and produce fresh standalone local APKs. Existing approved M17/M18 contracts and RPC/RLS remain authoritative; no schema or hosted provisioning change is authorized by these fixes. APK results must be recorded after actual compilation/signature/install/launch checks. Earlier sections below are historical evidence.

The first updated remote run passed formatting/lint/typecheck, all111 app suites/693 tests, database migrations/policies and secret checks, then exposed six SDK patch mismatches in Expo Doctor. Aligned only the reported compatible patch ranges (@expo/ui58.0.26, expo58.0.22, build-properties58.0.12, dev-client58.0.18, router58.0.29, screens4.30.1), with lockfile refreshed using npm10.9.9/Node22.23.2. Fresh local Expo Doctor passes20/20. Native build is being regenerated against these patches; no old APK is a current release artifact. The separate local HTTP suite could not run because the Docker engine pipe is absent; remote database CI passed, but is not HTTP acceptance.

## Competition video production — in progress — 2026-10-31

Owner-authorized autonomous video production is isolated under [`video-production/`](../video-production/README.md), with a persistent [checkpoint](../video-production/CHECKPOINT.md), on `feat/competition-video-production` from `2078bca`. The requested redesign is already merged in this local main revision. Existing `.gitignore` and `expo-env.d.ts` changes are preserved. Research verifies the PSA August 2026 figures; copyrighted news footage is excluded. Android capture uses the visibly disclosed synthetic offline fallback because a hosted two-principal rehearsal is unavailable. Do not treat the video as hosted acceptance or mark product milestones complete. Final MP4/render QA remains pending until the checkpoint records verified export evidence. No app feature change, hosted provisioning, commit, push, or merge is claimed.

## Redesign — committed — 2026-10-31

Committed on `feat/frontend-redesign-soft-productivity` as `0c99972` (design system + shell), `65f959b` (Home), `4b510cd` (My Work), `530d96f` (Activity + Profile); each typechecked in isolation, final state 110 suites / 690 tests. Full analysis with before/after screenshots: [brand redesign report](reports/2026-10-31-brand-redesign.md). Remaining: task workspace, gig details/applicants, Post a gig builder, auth restyle, legacy `setupTheme`/Inter cleanup. `gh` CLI is not authenticated, so the PR must be opened from the GitHub web compare page.

## Redesign — Activity + Profile — 2026-10-31

Activity (uncommitted): Today/Earlier groups in white cards, per-event icon circles (status-tinted), unread dot (mint with a dark ring for contrast), slim dismissible "Turn on device alerts" banner at the top only while alerts are off (dismissal is session-scoped), pull-to-refresh + Updated caption, typed errors; marking read invalidates the header bell badge. All notification/dedupe logic unchanged. Profile: centered 96dp avatar, name, area; stats row from real first-page reads (`useWorkCounts`, mode-aware, "20+" at cap); About (bio); outlined Edit profile (disabled only while loading); settings list (My work, Settings, Sign out). Retry now reloads profile + counts instead of opening the editor (bug found on device). New compact `ErrorState`. Skills/rating/availability remain `TODO(data)` (no columns). Emulator DNS is intermittent (UnknownHost at 04:55, recovered after); Activity and Profile verified on device, including banner dismissal and retry recovery. **110 suites / 690 tests**, format, lint, typecheck pass.

## Redesign — My Work — 2026-10-31

My Work rebuilt (uncommitted): purple segmented pills (worker Applications/Active/Completed; employer Posted/In progress/Completed), deep-linked `?section=` from Home tiles, TaskCards with real milestone progress (`listMilestones`, approved/non-cancelled; completed = 100%; no bar when unknown), status + Due soon/Overdue badges, counterpart avatar (`getAssignmentDetail`), lazily loaded per visible card with a 60 s shared cache (`src/features/work/data/work-insights.ts`). Employer mode adds the navy ProgressHeroCard with mint donut for milestones due this week (Due / To review / Approved). Removed the "N loaded" counter and refresh button; pull-to-refresh + Updated caption. Approved hardening D7 items 1–3: `work-gateway` now throws `LoadError` (same copy, classified kind) and a user-scoped first-page snapshot (`work-cache.ts`, zod-revalidated, served only for offline/timeout, never for auth errors) shows "Saved … · offline". Emulator: both modes verified; donut fill visually verified at a temporary 72% (reverted, file confirmed identical). **110 suites / 686 tests**, format, lint, typecheck pass.

## Redesign — Home — 2026-10-31

Home rebuilt on `feat/frontend-redesign-soft-productivity` (uncommitted): 2×2 stat tiles inside the navy hero from real reads (`src/features/shell/data/home-stats.ts`; worker Applied/Shortlisted/In progress/Completed, employer Active posts/Applicants/In progress/Completed; "20+" at the page cap, "–" while unknown; Shortlisted is a true 0 because no backend shortlist state exists; employer Applicants sums pending `list_gig_applicants` for up to 10 published gigs). Search bar with inline filter sheet (category + distance; ₱/schedule/skills await gateway support), width-fitting All/On-site/Remote pills, area chip, "N gigs (near you)" heading with Updated/offline caption, pull-to-refresh (refresh button removed), GigCards, compact empty states, and the center-button intent (`?intent=near|remote&at=`). The hero scrolls with the list on Home. Emulator now reaches Supabase; verified both modes, scrolling, and the filter sheet at 411dp. **109 suites / 679 tests**, format, lint, typecheck pass. Tile taps push `/(protected)/work?section=…`; My Work consumes it next.

## Redesign correction — brand palette + global shell — 2026-10-31

Owner rejected the green recolor. Brand palette (navy #1E1B4A, purple #7955CF, lavender tints only, mint accent) now lives in `src/shared/ui/theme.ts` (`brand`), with `@/theme` derived from it; green tokens removed. Global shell rebuilt: one navy rounded hero header (avatar, "Hi, {name}", screen name, white icon buttons, real-data unread dot), the Find/Offer pill switch moved into it, per-screen toggles/eyebrows/subtitles removed, and a new tab bar with a raised navy center FAB (Offer: Post a gig; Find: sheet with "Find gigs near me" / "Browse remote", routed to Home with an `intent` param that Home consumes in the next step). Verified on the Android 16 emulator (411dp) across all four tabs, the FAB sheet, and mode switching; format, lint, strict typecheck, **108 suites / 671 tests**. Screen bodies (Home, My Work, Activity, Profile) are the next steps. Uncommitted; no backend/Supabase changes.

## Soft-productivity redesign — Phase 1 — 2026-10-31

Owner approved all plan recommendations (D1–D7). M21 baseline committed as `6177b64` on `feat/frontend-marketplace`; redesign work is on `feat/frontend-redesign-soft-productivity` (uncommitted, awaiting owner review). Phase 1 adds `src/theme/` tokens (forest-teal palette, AA status triplets, Outfit type scale, spacing/radius/elevation/motion), bundled Outfit fonts with splash hold, a temporary `setupTheme` shim mapping legacy keys to the new tokens, the `src/components/ui/` library (built on core `Animated` because Reanimated 4.7 cannot load under this Jest setup), `src/shared/format` (₱/en-PH), and offline hardening infrastructure (`LoadError` classification, `ConnectivityProvider.reportRequestOutcome`). Not yet wired into screens (Phases 2–5). Verified: format, lint, strict typecheck, **108 suites / 668 tests**. No backend, Supabase config, dependency, or native changes.

## Soft-productivity redesign — Step 0 audit — 2026-10-31

Proposed only, awaiting owner approval: [redesign plan](redesign-plan.md). Diagnosis: the My Work/Activity/Profile load failures are caused by the **emulator having no internet**. DNS fails for all hosts and `ping 8.8.8.8` loses 100% of packets, while the host is online and `.env.local` targets the hosted project. The app's offline banner does not appear because `expo-network` reports the emulator as reachable. No code, backend, dependency, or environment changes were made; only `docs/redesign-plan.md` and this entry were added.

## Content-first composition follow-up — 2026-10-31

Final device/QA: Home/My Work/Activity inspected at **360dp / 150% text** after recovery from an emulator display-service stall/reboot. Horizontal My Work tabs corrected to prevent mid-word wrapping; selected Completed view, scroll clearance, Activity banner wrapping, filter scrollbar and Android back-to-Home checked. Final repeated full suite: **103 suites / 628 tests passed**. Density restored to physical420/font1.0, hardware-keyboard preference0. Docked keyboard and TalkBack remain unverified; input focus was checked with the existing floating IME. No backend mutation submitted.

Latest authorized density refinement updates Home search/filter composition, compact My Work/Activity headers, real loaded-row work summaries, work cards, recent-first Activity with smaller optional permission setup, and shared compact empty/loading/error states. Existing indigo/lavender/white, Inter and current-logo assets remain. Filter controls use 12-point rounding, cards18, statuses remain distinct. No backend/auth/API/environment/dependency/native/app-config changes in this follow-up; earlier uncommitted work retained.

Formatting, lint, strict TypeScript and **103 suites / 628 tests passed**. Final persistent horizontal filter scrollbar also passed focused Home15 tests/typecheck. Component fixtures validate populated/empty/loading/error states without production fake data. Default Android 16 emulator Home/My Work/Activity inspected; live backend mutations and real two-account/TalkBack acceptance remain pending. Detailed files, changes and keyboard/display-test limits: [content-first report](reports/2026-10-31-content-first-composition.md). No commit/push/merge.

## Lavender reference refinement — 2026-10-31

Final review: adaptive foreground uses a separate padded rendition; employer heading/action stacks at narrow widths/large fonts (visually confirmed at 360dp/150%). Focused config/Home18 tests, lint/typecheck/format/diff checks passed after those fixes. Display settings were restored again. No generated native files or backend files changed.

The latest approved reference-inspired follow-up softens cards/filter/navigation layers, compacts worker discovery, separates employer metrics into real-data icon cards, and refines existing secondary screens. Four licensed local Inter faces now load with existing Expo Font through typed typography wrappers; error fallback preserves usability. Current owner-logo PNG is also referenced by Expo icon/adaptive-icon/splash configuration per the latest request; generated Android files are untouched and no native rebuild/prebuild occurred. Earlier native-configuration-preserved statements refer to earlier follow-ups.

Verification: formatting, ESLint, strict TypeScript, **103 suites / 617 tests passed**; focused location/navigation tests and shared-state/filter tests passed after final layout/label adjustments. Android 16 Development Build inspection covered default 411dp/100% and worker/employer dashboards at 360dp/150%, including scroll, large-text wrapping, role switching, original logo and navigation. Density/font scale restored. Live backend mutations, TalkBack, native icon/splash appearance and docked keyboard acceptance remain pending. No backend/auth/API/environment/dependency changes, paid service, commit, push or merge. See [files, assets, run commands, and limits](reports/2026-10-31-lavender-visual-refinement.md).

## Professional dashboard redesign follow-up — 2026-10-31

Final verification: formatting, ESLint, strict TypeScript, and **102 Jest suites / 614 tests passed** after all review fixes. `git diff --check` passed. Supabase, package/lockfile, and AuthProvider have no diff. Default-size Profile was additionally visually inspected; backend workflow acceptance remains pending.

Current follow-up on `feat/frontend-marketplace` implements distinct worker/employer dashboards, compact header/navigation, grouped forms/details, unified profile/settings/work/activity screens, accessible location state, honest On-site filtering, and bounded scrollable confirmation dialogs. The owner's new SVG is preserved and displayed via a faithful local PNG rendition because its embedded masks rendered blank on Android. Existing icons/system fonts are reused; no dependencies, backend/auth contracts, environment, or native configuration changed in this follow-up. The existing dev-client runtime API hides its overlapping floating gear. See [changes, files, assets, and acceptance boundaries](reports/2026-10-31-professional-dashboard-redesign.md).

Actual Android 16 Development Build inspection covered default 411dp/100% and 360dp/150% text dashboards, role switching, logo display, and the default-size grouped gig form. Display settings were restored. No real backend mutation was submitted. Live two-account workflows, TalkBack, docked keyboard, and populated-data device acceptance remain pending; Activity-recreation routing warnings remain the separately documented framework limitation. Changes are uncommitted; no push/merge/prebuild/native rebuild.

## Current frontend checkpoint — 2026-10-31

- **Latest navigation investigation:** no duplicate NavigationContainer/ExpoRoot/registration exists in application source; all nested Stacks are retained. Reproduced the warning by changing/restoring emulator font scale without navigation: asynchronous Expo/Fabric Activity teardown overlaps router roots in the same JS runtime. Cold process restart/reconnect recovered the emulator, with zero queue/linking warnings in new-PID logs. This is runtime recovery, not a permanent native framework fix; the Activity-recreation trigger can recur. No app/native/dependency/backend/environment changes were made. Lint, strict TypeScript, and 3 relevant Jest suites / 23 tests passed. See [navigation runtime investigation](reports/2026-10-31-navigation-runtime-investigation.md) for source evidence, recovery commands, validation, and remaining durable-fix boundary.

- **Latest creative-assets refinement:** existing Expo Symbols/Material Symbols now power a typed accessible icon system across authentication, onboarding, navigation, discovery cards, My Work, profile, and shared states. Original native onboarding artwork uses abstract task cards; no invented production data. No packages, fonts/weights, backend/native configuration, or credentials were added/changed. Source/license notices are under `branding/`. Formatting, lint, strict typecheck, and **100 suites / 608 tests** pass. Auth/onboarding rendering, scrolling, icon scaling, and action access were checked on the running Android 16 emulator at 411dp/100% and 360dp/150%; display settings were restored. Authenticated screen device acceptance, TalkBack, standard docked keyboard, and real OAuth remain pending. Development navigation/reload warnings were observed during activity recreation. Changes remain uncommitted; no push/merge/prebuild/native rebuild. See the report's creative-assets section.

- **Latest auth refinement:** owner-requested compact authentication redesign changes only `AccountAccessScreen.tsx` and its component tests, plus these durable records. Smaller logo/heading, visible access tabs, lavender/white form, inline password visibility, dark status bar, and retained loading labels. All existing auth callbacks/contracts remain intact. Formatting, lint, strict typecheck, and **98 suites / 605 tests** pass. The running Android 16 Development Build was visually inspected at default 411dp/100% text and 360dp/150% text; temporary display/IME settings were restored. Standard docked soft-keyboard, TalkBack, and real email/Google acceptance remain pending. No prebuild, native reset, Android rebuild, environment change, dependency change, or real auth submission occurred in this follow-up. See the report's authentication follow-up section for scope and limits.

- **Branch:** `feat/frontend-marketplace`, created from local `main` at `88cbfbf`. The previous `chore/local-build-unblocking` branch and its build-recovery documentation commit remain intact.
- **Milestone:** M21 frontend marketplace refinement; implementation locally verified, `IN PROGRESS` pending review and Android acceptance. Changes are uncommitted; no PR, push, merge, or deployment occurred.
- **Authorization:** the owner's frontend task approves reuse of the existing Expo Router architecture and frontend acceptance requirements. Backend contracts and zero-cost constraints remain unchanged.
- **Implemented:** original-logo indigo/mint theme; 14 shared UI primitives; native splash configuration; optional three-step introduction; password visibility and keyboard-safe authentication/profile setup; four-tab navigation; real discovery search/filter/pagination; My Work applications/listings/active/completed work; name/area/bio editing; real employer names and supported deadlines; applicant-selection confirmation; authoritative milestone progress/approval refresh; retryable activity and partial-load errors.
- **Privacy corrections:** discovery snapshots partition filters, coordinates and pagination; related gig and assignment caches require explicit user scope and validated snapshots, refuse authorization-error fallback, and ignore legacy anonymous private snapshots. Assignment/gig routes pass authenticated IDs and key private screens by user/resource where applicable.
- **Verified:** `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test:run` (**98 suites / 602 tests**), `git diff --check`, and `npx.cmd expo export --platform android --output-dir .codex-artifacts/frontend-export` (Hermes bundle approximately 5 MB, original logo bundled). Expo-generated `.gitignore`/`expo-env.d.ts` churn was removed after export.
- **Preserved:** no changes to `supabase/`, dependencies/lockfile, configured Supabase client, AuthProvider, credentials, RLS, migrations, notification infrastructure, or external-service spending. Demo data remains isolated in its existing runtime.
- **Acceptance limits:** ADB found no attached device/emulator; no new device or hosted-workflow test was performed. Native splash requires native project regeneration/rebuild. Existing scoped assignment fallback still lacks a per-detail timestamp badge; child-read failures remain explicit and mutations require server confirmation.
- **Unavailable capabilities:** structured skills/experience/ratings/reviews, established avatar upload, complete password-recovery route/callback, configured live AI inference, and remote push. Existing editable template builder and local notifications remain honest and functional.
- **GitHub:** `gh issue list` and `gh pr list` failed because CLI authentication is absent. No live issue/PR state is asserted. Prepare one cohesive M21 PR after authentication; do not merge without explicit owner approval.
- **Full report / exact files / commands:** [Frontend implementation report](reports/2026-10-31-frontend-marketplace.md); [approved-scope plan](plans/2026-10-31-m21-frontend-marketplace.md).
- **Next:** review the diff, regenerate/rebuild Android locally, test small-screen keyboard/font scaling/back navigation and real two-account workflows, then submit the cohesive PR with screenshots and evidence. Existing M03B/physical-device and operational acceptance gates below remain open.

## M20 operational snapshot (historical)

- **Last verified:** 2026-10-26 (Asia/Manila)
- **Completed milestones:** M01 — Expo initialization; M02 — Supabase schema; M03A — auth foundation; D01 — Offline Demo; M04 — Marketplace shell; M05 — Gig creation; M06 — Discovery; M07 — Applications; M08 — Agreements; M09 — Submissions; M10 — AI Brief Builder; M11 — Location; M12 — Notifications/evidence; M13 — Weak-connectivity; M14 — Security & tests; M15 — CI & Productization Reset; M17 — Settings, Workspace Persistence & Admin Capability; M18 — Functional Moderation & Reporting UI; M19 — Presentation Hardening & Identity Boundaries; M20 — Database Parity, Operator Provisioning & HTTP Multi-Principal Integration
- **Current milestone:** M20 — Database Parity, Operator Provisioning & HTTP Multi-Principal Integration
- **Status:** `COMPLETED`
- **Branch:** `chore/local-build-unblocking`, based on `88cbfbf` (`docs: record hosted migration parity`)
- **Base/default branch:** `main`
- **Current implementation merge:** `2632a21` (`Merge pull request #42`)
- **Current verification attempt:** `2026-10-26`; hosted migrations already match through `20261026000100`. The native `x86_64` release APK now builds, verifies, installs, and cold-launches on `emulator-5554`. ARM64 compilation and signature verification also passed. Docker Desktop and WSL are installed, but the engine remains unavailable pending a Windows restart. The owner/admin email is explicitly authorized and configured only in ignored local environment; the latest hosted dry-run returned `user_not_found` / `require_user_login`. No provisioning apply or admin grant occurred.
- **Remote:** `https://github.com/DanielHC16/do-well` (`PRIVATE`)
- **M01 PR:** [#17](https://github.com/DanielHC16/do-well/pull/17), squash-merged as `d073c4b`
- **M02 PR:** [#19](https://github.com/DanielHC16/do-well/pull/19), merge commit `f7a3317`
- **M03A PR:** [#22](https://github.com/DanielHC16/do-well/pull/22), merged as `368613a`
- **D01 PR:** [#24](https://github.com/DanielHC16/do-well/pull/24), merged as `d7092c3`
- **M04 PR:** [#26](https://github.com/DanielHC16/do-well/pull/26), merged as `b75a13e`
- **M05 PR:** [#27](https://github.com/DanielHC16/do-well/pull/27), merged as `464d06b`
- **M06 PR:** [#28](https://github.com/DanielHC16/do-well/pull/28), merged as `a0cd300`
- **M07 PR:** [#29](https://github.com/DanielHC16/do-well/pull/29), merged as `5d0dac5`
- **M08 PR:** [#30](https://github.com/DanielHC16/do-well/pull/30), merged as `9e177e1`
- **M09 PR:** [#31](https://github.com/DanielHC16/do-well/pull/31), merged as `70c6032`
- **M10 PR:** [#32](https://github.com/DanielHC16/do-well/pull/32), merged as `29b9924`
- **M11 PR:** [#33](https://github.com/DanielHC16/do-well/pull/33), merged as `58cf36a`
- **M12 PR:** [#34](https://github.com/DanielHC16/do-well/pull/34), merged as `04cf199`; corrective hardening merged via [#35](https://github.com/DanielHC16/do-well/pull/35) as `ae953f3`
- **M13 PR:** [#36](https://github.com/DanielHC16/do-well/pull/36), merged as `e0d3a5d`
- **M14 PR:** [#37](https://github.com/DanielHC16/do-well/pull/37), merged as `efe12fd`
- **Audit PR:** [#38](https://github.com/DanielHC16/do-well/pull/38), merged as `5839b68`
- **Docs PR:** [#39](https://github.com/DanielHC16/do-well/pull/39), merged as `4f8cbe0`
- **Productization PR:** [#40](https://github.com/DanielHC16/do-well/pull/40), merged as `db01a52`
- **Reporting & Presentation PR:** [#41](https://github.com/DanielHC16/do-well/pull/41), merged as `b8a9890`
- **Database Parity & Provisioning PR:** [#42](https://github.com/DanielHC16/do-well/pull/42), merged as `2632a21`

This file records repository evidence, not chat state. Re-run the verification commands before relying on it.

## M01 closeout

M01 is merged. The Expo SDK 58 app, strict TypeScript/Jest checks, local Android development build, and emulator/physical-device launch proof are on `main`. The authorized Infinix X6840/API 36 evidence remains at [`docs/evidence/m01-physical-device.png`](evidence/m01-physical-device.png).

## M02 completed state

- Supabase CLI `2.121.0` is pinned as a project development dependency and exposed through `db:start`, `db:stop`, `db:reset`, `db:lint`, `db:test`, `db:types`, and `db:types:check`.
- Docker runs the disposable local stack on isolated ports `55320`-`55329` plus Edge Runtime inspector `5583`.
- Ordered migrations currently define the schema foundation, RLS/grants, and private `submission-evidence` Storage policies.
- Local seed fixtures, pgTAP tests, generated database types, and their drift-check script exist.
- Workflow RPC names remain architectural contracts only. Real transactional functions are deferred to their workflow milestones; direct workflow mutation remains fail-closed rather than using no-op RPCs.
- The eight-category list is provisional and held in a named check constraint for a backward-compatible future allowlist migration.
- `activity_events.event_type` currently enforces conservative lowercase snake-case syntax; workflow milestones will add semantic event allowlists.

## Verified M02 evidence

- `npm run db:reset` passed twice from the local migration chain.
- `npm run db:test` passed 5 pgTAP files / 50 tests; `npm run db:test:performance` separately passed 5 query-plan assertions over 10,000 gigs and 50,000 applications.
- `npm run db:lint` reported no schema errors, and `npm run db:types:check` confirmed the generated types are current.
- Real JWT integration through the local HTTP/Auth path is deferred to M03; current policy tests use database role/claim impersonation.

## Local and external state

- Docker Desktop is required for all database commands.
- `.env.local` remains ignored and must contain valid dotenv assignments only; do not place PowerShell syntax in it.
- The authorized hosted Supabase project is linked locally through ignored CLI state. On 2026-10-25, a schema/data backup and `db push --dry-run` were captured under ignored `.codex-artifacts/`, then all four reviewed migrations were applied without seed data.
- Remote migration history now matches `20261022000100`, `20261022000200`, `20261022000300`, and `20261023000100`. The hosted public schema was empty before the push, so no pre-existing application object was overwritten.
- Hosted credentials remain only in ignored local configuration. Rotate the access token and database password after development because they were shared in conversation.
- No billing, payment method, cloud build, or paid service was enabled.
- Local environment and OAuth credential files may be used when required, but their values must never be printed, logged, committed, or exposed through privileged `EXPO_PUBLIC_*` variables.

## M03 implementation checkpoint

- Public Supabase configuration is validated, the React Native client uses PKCE with URL auto-detection disabled, and provider tokens are removed at the persistence boundary.
- Expo Crypto now supplies the React Native WebCrypto capabilities required by Supabase Auth, and a real-client regression test proves OAuth authorization URLs use `code_challenge_method=s256` rather than the insecure plain fallback.
- Secure profile repair/completion RPCs and real local Auth/JWT integration coverage are committed.
- The client auth reducer rejects stale operation/account results and keeps vendor messages outside renderable state.
- Auth/profile gateways normalize input, validate provider/database output, use local-only sign-out, and convert unexpected boundary failures to stable application errors.
- OAuth, email-confirmation, and password-recovery callbacks use exact app routes and one typed five-minute pending attempt. Attempts are consumed before code exchange and cannot be replayed.
- Supabase authorization URLs require the configured exact origin, `/auth/v1/authorize`, Google provider, and the exact application callback.
- Independent review findings about stale generations and raw gateway failures were fixed in `f8c9101`.
- One root provider now restores and refreshes sessions with operation-generation guards, protects every route group, and keeps a minimal non-authoritative profile-gate snapshot partitioned by user ID.
- Google browser sign-in has accessible pending/error states, strict authorization/callback validation, one-time attempt consumption, cold-start handling, and foreground callback coalescing. Email/password and recovery UI are intentionally deferred by the owner's Google-only instruction; the gateway contracts remain available.
- Required onboarding validates bounded inputs, calls only the server RPC, remains retryable on failure, reloads the authoritative profile, and rejects direct protected-route bypass.
- Latest verification: formatting, lint, strict typecheck, 23 Jest suites / 122 tests, local Auth/JWT integration, 6 pgTAP files / 69 database tests, database lint/type drift, and all 20 Expo Doctor checks pass.

## M04 completed state

- M04 merged into `main` via PR #26 (`b75a13e`).
- Shell mode schema, AsyncStorage per-user mode persistence, context provider, and retry boundaries implemented in `src/features/shell/`.
- Noticeboard marketplace shell with top bar brand strip, dual-mode switcher (`worker` vs `employer`), and bottom navigation tab list (`Home`, `Activity`, `Profile`).
- Protected routes created under `app/(protected)/`: `_layout.tsx`, `index.tsx`, `worker.tsx`, `employer.tsx`, `activity.tsx`, `profile.tsx`, and `[...unmatched].tsx`.
- Verification passed: 37 Jest test suites / 182 tests passing, clean TypeScript strict typecheck (`tsc --noEmit`), clean Prettier, clean ESLint, and 20/20 `expo-doctor` checks.

## M05 completed state

- M05 merged into `main` via PR #27 (`464d06b`), closing Issue #6.
- Security-definer RPCs `publish_gig(uuid)` and `close_gig(uuid)` with `search_path = ''`, ownership checks, status transition enforcement, and `activity_events` audit logging implemented in `supabase/migrations/20261025000100_gig_lifecycle_rpcs.sql`.
- Database tests in `supabase/tests/070_gig_management_rpcs.test.sql` verify happy paths, non-owner rejections, invalid status transitions, and audit records (7 pgTAP files / 86 tests passing).
- Generated database types updated and verified via `scripts/database-types.mjs`.
- Domain validation in `src/features/gigs/model/gig-schemas.ts` covers 8 categories, 3 work modes, budget rules, and area constraints.
- Local draft persistence in `src/features/gigs/data/gig-draft-store.ts` via AsyncStorage.
- Gateway service in `src/features/gigs/data/gig-gateway.ts` handles draft CRUD, RPC execution, and type-safe row mapping.
- Screens implemented: `GigFormScreen.tsx` with draft loading and AI brief disclaimer (deferred to M10), and `EmployerGigDetailScreen.tsx` with publish and close actions.
- Navigation routes wired: `app/(protected)/employer/gigs/new.tsx` and `app/(protected)/employer/gigs/[gigId].tsx`.
- Noticeboard updated: `AuthenticatedHomeScreen.tsx` shows employer's posted notices and link to gig creation.
- Quality verification: 42 Jest suites / 212 tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M06 completed state

- Plan document penned at `docs/plans/2026-10-25-m06-gig-discovery.md`.
- Database functions `calculate_distance_km` and `discover_gigs` added in `supabase/migrations/20261025000200_gig_discovery_rpcs.sql`.
  - Pure SQL Haversine spherical distance calculation (zero external API, PHP 0 / USD 0 budget ceiling).
  - Deterministic explainable reason generation (`Within 5 km of you`, `Within 15 km of you`, `Remote - work from anywhere`, `Recently posted`).
  - Strict privacy projection: only coarse `public_area`, `public_latitude`, `public_longitude` are returned; exact coordinates and private addresses in `gig_private_locations` remain inaccessible under server RLS.
- Database tests added in `supabase/tests/080_gig_discovery_rpcs.test.sql` (8 pgTAP files / 98 tests passing).
- Discovery schemas and gateway implemented in `src/features/discovery/model/` and `src/features/discovery/data/`.
- UI screens and routes implemented:
  - `WorkerGigDetailScreen.tsx` displaying public details, reason chips, and M07 application notice.
  - Route `app/(protected)/worker/gigs/[gigId].tsx`.
  - Noticeboard feed on `AuthenticatedHomeScreen.tsx` with mode toggles (All / Nearby / Remote), category pills horizontal scroll, cards with budget, distance, area, and explainable chips.
- Quality verification: 45 Jest suites / 224 tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M07 completed state

- Plan document penned at `docs/plans/2026-10-25-m07-worker-applications.md`.
- Database functions and RPCs implemented in `supabase/migrations/20261025000300_application_and_selection_rpcs.sql`:
  - `apply_to_gig(p_gig_id, p_message, p_client_request_id)`: Enforces caller authentication (`42501`), profile onboarding completion (`P0002`), published status (`P0004`), self-dealing prohibition (`P0005`), deadline validation, partial unique index idempotency, single live application enforcement (`P0008`), message length checks, and audit logging into `activity_events` (`gig_application_received`).
  - `withdraw_application(p_application_id)`: Enforces ownership (`P0010`), pending status (`P0011`), transitions application to `withdrawn`, and records `gig_application_withdrawn` event.
  - `select_worker_atomic(p_application_id, p_client_request_id)`: Atomically locks gig and winning application (`SELECT ... FOR UPDATE`), validates employer ownership (`P0013`), gig published state (`P0014`), application pending state (`P0012`), accepts winner, mass-rejects competing applications for the gig, closes gig (`status = 'closed'`), instantiates assignment with proposed terms, records `gig_applicant_selected` activity event, and returns assignment with idempotency.
  - Query helper RPCs `list_gig_applicants(p_gig_id)` and `get_worker_application_for_gig(p_gig_id)` with explicit permission revocation from public/anon and execute grant strictly to `authenticated`.
- Database tests added in `supabase/tests/090_application_and_selection_rpcs.test.sql` (9 pgTAP files / 127 tests passing).
- Application schemas and gateway implemented in `src/features/applications/model/` and `src/features/applications/data/`.
- UI screens and routes integrated:
  - `WorkerGigDetailScreen.tsx`: Application submission form with character limit, submission feedback, `PENDING REVIEW` state card, note disclosure, and `Withdraw Application` flow.
  - `EmployerGigDetailScreen.tsx`: Applicants review list with applicant cards, location, applied date, message note, atomic `Select Worker` action with confirmation, and `ACTIVE ASSIGNMENT` banner displaying proposed terms.
- Quality verification: 47 Jest suites / 236 tests pass, 9 pgTAP files / 127 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.
- Merged to `main` via PR #29 (`5d0dac5`), closing Issue #8.

## M08 completed state

- Merged to `main` via PR #30 (`9e177e1`), closing Issue #9.

## M09 completed state

- Plan document authored at `docs/plans/2026-10-25-m09-work-submission.md`.
- Database functions and RPCs implemented in `supabase/migrations/20261025000500_submission_and_approval_rpcs.sql`:
  - `submit_assignment_work(p_assignment_id, p_note, p_milestone_id, p_client_request_id)`: Worker-only submission (`P0031`), checks onboarding (`P0002`), validates active or revision-requested status (`P0032`), validates milestone ownership (`P0033`), checks note length 1..2000 (`P0039`), auto-increments version (v1, v2...), sets `status = 'submitted'`, updates assignment to `submitted`, records `work_submitted` activity event with dedupe key.
  - `request_submission_revision(p_submission_id, p_review_note)`: Employer-only revision request (`P0036`), checks review note 1..2000 chars (`P0034`), verifies submitted status (`P0037`/`P0038`), updates submission to `revision_requested`, updates assignment to `revision_requested`, and emits `revision_requested` activity event for worker.
  - `approve_assignment_completion(p_submission_id, p_review_note)`: Employer-only approval (`P0036`), verifies submitted status (`P0037`/`P0038`), updates submission to `approved`, updates assignment to `completed` with `completed_at = now()`, automatically approves unapproved assignment milestones, and emits `assignment_completed` activity event for worker.
  - `list_assignment_submissions(p_assignment_id)`: Returns ordered submissions by `version desc, created_at desc` for assignment participants.
  - `get_latest_assignment_submission(p_assignment_id)`: Returns latest submission record for assignment participants.
  - Revoked all from `public`, `anon`; granted execute strictly to `authenticated`.
- Database tests in `supabase/tests/110_submission_and_approval_rpcs.test.sql` (11 pgTAP files / 191 tests passing).
- Domain schemas and gateway implemented in `src/features/submissions/`.
- UI screens and routes integrated:
  - `WorkerAssignmentDetailScreen.tsx`: Submission note form, revision instructions banner, under-review state card, completed state banner, and submission history.
  - `EmployerAssignmentDetailScreen.tsx`: Worker submission review card, "Approve & Complete Work" action, "Request Revision" modal/form with required review note, revision pending card, and completed state banner.
  - `AuthenticatedActivityScreen.tsx`: Event formatters for `work_submitted`, `revision_requested`, and `assignment_completed`.
- Quality verification: 53 Jest suites / 279 tests pass, 11 pgTAP files / 191 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

- Plan document penned at `docs/plans/2026-10-25-m08-task-agreements.md`.
- Database functions and RPCs implemented in `supabase/migrations/20261025000400_assignment_and_milestone_rpcs.sql`:
  - `confirm_assignment(p_assignment_id)`: Worker-only agreement acceptance (`P0020`), verifies `proposed` status (`P0021`), sets `status = 'active'`, `worker_confirmed_at = now()`, `started_at = now()`, and emits `assignment_confirmed` activity event.
  - `decline_assignment(p_assignment_id)`: Worker-only decline (`P0020`), sets `status = 'declined'`, `cancelled_at = now()`, reopens gig notice to `published`, marks application `status = 'declined'`, and emits `assignment_declined` activity event.
  - `cancel_proposed_assignment(p_assignment_id)`: Employer-only cancellation (`P0022`), sets `status = 'cancelled'`, `cancelled_at = now()`, reopens gig notice to `published`, marks application `status = 'rejected'`, and emits `assignment_cancelled` activity event.
  - `create_assignment_milestone(p_assignment_id, p_title, p_description, p_due_at)`: Employer-only milestone builder (`P0023`), checks assignment status (`P0024`), auto-increments position 1..20 (`P0027`), title bounds 2..100 (`P0025`), description max 1000 (`P0026`), inserts with `status = 'pending'`, and emits `milestone_created` for worker.
  - `start_assignment_milestone(p_milestone_id)`: Worker-only milestone start (`P0028`), checks active assignment (`P0029`), pending milestone status (`P0030`), sets `status = 'in_progress'`, and emits `milestone_started` for employer.
  - `list_assignment_milestones(p_assignment_id)`: Ordered milestone query by `position asc` for assignment participants.
  - `get_assignment_detail(p_assignment_id)`: Returns joined assignment, employer profile, worker profile, and gig summary JSON for assignment participants.
  - `list_user_activity(p_limit, p_offset)`: Returns recipient's activity event records ordered by `created_at desc`.
  - `mark_activity_read(p_event_id)`: Sets `read_at = clock_timestamp()` for owned event.
  - Revoked all from `public`, `anon`; granted execute strictly to `authenticated`.
- Database tests added in `supabase/tests/100_assignment_and_milestone_rpcs.test.sql` (10 pgTAP files / 158 tests passing).
- Domain schemas and gateway implemented in `src/features/assignments/model/` and `src/features/assignments/data/`.
- UI screens and routes integrated:
  - `WorkerAssignmentDetailScreen.tsx`: Agreement review, terms, employer profile card, confirm and decline actions, and ordered milestones view with start milestone action.
  - `EmployerAssignmentDetailScreen.tsx`: Agreement details, selected worker profile card, cancel proposal action, ordered milestone step breakdown, and milestone creation modal/card.
  - `AuthenticatedActivityScreen.tsx`: Live activity feed with read markers, relative timestamps, and navigation links to assignment agreements.
  - Routes: `app/(protected)/worker/assignments/[assignmentId].tsx` and `app/(protected)/employer/assignments/[assignmentId].tsx`.
  - Route tests in `app/(protected)/__tests__/routes.test.tsx`.
- Quality verification: 51 Jest suites / 259 tests pass, 10 pgTAP files / 158 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M11 completed state

- ADR 0007 penned at `docs/adr/0007-foreground-location-and-list-first-discovery.md` establishing one-shot foreground approximate location and list-first nearby discovery at zero external spend (PHP 0 / USD 0).
- Plan document authored at `docs/plans/2026-10-25-m11-android-location.md`.
- `expo-location` pinned to `~58.0.19` compatible with Expo SDK 58.
- Android permissions `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` configured in `app.config.ts` with explicit user-facing purpose descriptions; background location disabled.
- Domain schemas in `src/features/location/model/location-schemas.ts`: `LocationCoordinatesSchema`, `LocationPermissionStateSchema`, `LocalityOptionSchema`, `ActiveLocationSchema`, `METRO_MANILA_LOCALITIES`, and helper functions.
- Location service adapter in `src/features/location/data/location-service.ts` with balanced accuracy, 5000ms timeout race, and defensive permission mapping (`undetermined`, `granted`, `denied`, `blocked`, `services_disabled`).
- UI components: `LocationBar.tsx` and `LocationSelectorModal.tsx` in `src/features/location/components/`.
- Noticeboard integration: `AuthenticatedHomeScreen.tsx` connects `LocationBar` and `LocationSelectorModal`, passing coordinates and radius filter directly to `discoveryGateway.discoverGigs({ workerLatitude, workerLongitude, filters })`.
- Quality verification: 63 Jest test suites / 388 tests pass, 11 pgTAP files / 191 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.
- Merged into `main` via PR #33 (`58cf36a`), closing Issue #12.

## M12 completed state

- Plan document authored at `docs/plans/2026-10-25-m12-evidence-and-notifications.md`.
- `expo-image-picker` (`~58.0.10`) and `expo-notifications` (`~58.1.6`) pinned for Expo SDK 58 New Architecture.
- Android permissions and plugins configured in `app.config.ts`: `POST_NOTIFICATIONS` permission and `expo-image-picker` with `microphonePermission: false`.
- Database functions and RPCs implemented in `supabase/migrations/20261025000600_evidence_submission_rpcs.sql`:
  - `begin_submission(p_assignment_id, p_milestone_id, p_note, p_client_request_id)`: Reserves `pending_upload` submission record with version bump, worker validation (`P0031`), active/revision status check (`P0032`), and client request deduplication.
  - `finalize_submission(p_submission_id, p_files)`: Validates private object paths `{submitted_by}/{assignment_id}/{submission_id}/{file_id}.ext`, inserts file records into `submission_files`, sets submission to `submitted`, sets assignment to `submitted`, and emits `work_submitted` into `activity_events`.
  - `list_submission_files(p_submission_id)`: Securely lists attached evidence records for assignment participants.
  - Permissions revoked from `public, anon`; granted strictly to `authenticated`.
- pgTAP database test suite `supabase/tests/120_evidence_submission_rpcs.test.sql` (12 pgTAP files / 212 tests pass).
- Evidence domain, service, and picker:
  - `src/features/submissions/model/submission-schemas.ts`: Added `SelectedEvidenceImageSchema`, `SubmissionFileRecordSchema`, `BeginSubmissionInputSchema`, `FinalizeSubmissionInputSchema`.
  - `src/features/submissions/data/submission-gateway.ts`: Added `beginSubmission`, `finalizeSubmission`, `listSubmissionFiles`, `createEvidenceSignedUrl`, `uploadEvidenceBlob`.
  - `src/features/submissions/evidence/services/evidence-image-service.ts`: Media library and camera selection with 5MB cap, JPEG/PNG/WEBP validation, `exif: false`, and `readImageBlob`.
  - `src/features/submissions/evidence/components/EvidenceAttachmentPicker.tsx`: Accessible thumbnail preview cards, file size badges, and deletion controls.
- Local notifications system:
  - `src/features/notifications/model/notification-schemas.ts`: Configured Android channels `assignment_updates`, `milestone_alerts`, `general_alerts`.
  - `src/features/notifications/services/notification-service.ts`: Channel-aware local dispatch, foreground presentation, permission checks, and allowlisted cold-start/foreground notification-response routes.
- UI Screens integrated:
  - `WorkerAssignmentDetailScreen.tsx`: Evidence attachment picker and staged `begin -> upload -> finalize` pipeline with stable per-attempt UUIDs, in-session retry reuse, and measured upload sizes.
  - `EmployerAssignmentDetailScreen.tsx`: Evidence photo thumbnails with private short-lived signed URLs; review actions fail closed while evidence is loading or cannot be verified.
  - `AuthenticatedActivityScreen.tsx`: Explicit local-alert permission control and per-account deduplicated recipient notifications derived from canonical unread activity events. Actor-side self-notifications were removed.
- Corrective migration `20261025000700_harden_evidence_finalization.sql` locks assignment version allocation and requires every manifest entry to match an existing private Storage object, MIME, size, UUID path, extension, JSON shape, and five-file server cap before state advances.
- The audit and disposition are recorded in `docs/reports/2026-10-25-m12-implementation-audit.md`.
- Quality verification: 69 Jest test suites / 438 tests pass, 12 pgTAP files / 212 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M13 completed state

- Plan document penned at `docs/plans/2026-10-25-m13-connectivity-resilience.md`.
- Network detection and context:
  - Installed `expo-network` (`~58.0.4`).
  - `src/features/connectivity/services/connectivity-service.ts`: Testable `expo-network` wrapper with fail-open fallback and clean listener teardown.
  - `src/features/connectivity/context/ConnectivityProvider.tsx`: React context provider supplying reactive `isConnected`, `isInternetReachable`, and `connectionType`.
  - `src/features/connectivity/components/OfflineBanner.tsx`: High-contrast accessible offline warning banner mounted in `MarketplaceShell`.
  - `src/features/connectivity/components/StaleDataBadge.tsx`: Visual badge indicating snapshot timestamp on cached data.
- User-scoped bounded read cache:
  - `src/shared/persistence/cache-store.ts`: User-isolated AsyncStorage cache scoped to `@dowell/cache/{userId}/{key}` with 50-entry LRU eviction cap and 500 KB per-entry boundary.
  - Automatic cache purge on sign-out and account switch wired into `AuthProvider`.
  - Integrated offline cache fallback with `cachedAt` metadata in `discoveryGateway` and `assignmentGateway`.
- Form drafts and mutation resilience:
  - `src/features/applications/data/application-draft-store.ts`: Persistent AsyncStorage draft store for worker bids.
  - `src/features/submissions/data/submission-draft-store.ts`: Persistent AsyncStorage draft store for worker submission notes and photo references.
  - `src/shared/api/network-timeout.ts`: 12-second bounded abort timeouts and mutation reconciliation helpers.
- Quality verification: 77 Jest test suites / 468 tests pass, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M14 completed state

- Plan document penned at `docs/plans/2026-10-25-m14-security-build.md`.
- Security verification and secret scan:
  - `tests/security/secret-exposure.test.js`: Confirms zero tracked or bundled secrets in git or client code.
  - `tests/security/authorization-boundaries.test.ts`: Validates schema rules, RPC transition guards, employer/worker role disjointness, storage boundary constraints (max 5 files, 5MB, JPEG/PNG/WEBP, private paths), and user-partitioned caching.
  - `tests/security/truth-in-advertising.test.ts`: Asserts foreground-only location permissions (background tracking strictly disabled), local-only notification scheduling, deterministic heuristic AI Brief generation disclaimer, and prominent offline demo preview disclosures.
- End-to-end competition scenario test suite:
  - `tests/e2e/competition-workflow.test.ts`: Full 5-stage lifecycle scenario verified end-to-end (Employer gig creation -> Worker application -> Selection & atomic agreement -> Work submission with evidence -> Employer approval & completion) with multi-role security negative assertions.
- Competition build & runbooks:
  - `docs/COMPETITION_BUILD.md`: Android release APK compilation commands, checksum verification, apksigner instructions, and zero-cost build profiles.
  - `docs/DEMO_RUNBOOK.md`: Authoritative 3-5 minute live judging script and feature showcase walkthrough.
  - `docs/DISASTER_RECOVERY.md`: Presentation contingency matrix, network failure pivot, and local database backup/restore procedures.
  - Static Hermes Android bundle verified: `npx expo export --platform android` generated 4.9MB bundle with 0 errors.
- Quality verification: 81 Jest test suites / 482 tests pass, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M20 completed state

- Database migration parity and function overloading resolved in `supabase/migrations/20261026000100_admin_roles_and_reporting.sql`.
- Private Storage policy `submission_evidence_insert_worker` hardened to support both raw test fixtures and Supabase Storage API direct HTTP uploads (`metadata ->> 'size'` and `metadata ->> 'contentLength'`).
- Operator demo provisioning CLI tool implemented at `scripts/provision-demo-environment.cjs` and `scripts/provision-demo-environment.mjs`, accompanied by 11 unit tests in `scripts/__tests__/provision-demo-environment.test.js`. Supports `--dry-run`, `--apply`, `--local`, `--hosted`, and custom account configurations while strictly respecting server constraints and writing sanitized summaries to `.codex-artifacts/demo-accounts.json`.
- Operator hosted deployment manual authored at `docs/HOSTED_DEMO_SETUP.md`.
- Comprehensive multi-principal production workflow integration test implemented at `tests/integration/production-workflow-http.test.ts`. Executes the complete 14-step journey over real HTTP REST and RPC boundaries (signup, onboarding, gig creation, discovery, application, selection, agreement, milestone, storage upload, finalization, approval, report creation, and admin resolution) with non-admin security negative checks and clean teardown.
- Verification passed: 92 Jest test suites / 538 tests passing, 2 integration test suites passing, 13 pgTAP database test suites / 253 tests passing, zero format, lint, or typecheck errors, 20/20 Expo Doctor checks, and clean Android Hermes bytecode export.

## Open product decisions

- Set evidence and abandoned-upload retention periods before M09 cleanup behavior is implemented.

## Demo-first pivot

- The owner approved an isolated offline demo runtime on 2026-10-25 so the core product story can be demonstrated before hosted authentication is accepted.
- ADR 0006 and `docs/plans/2026-10-25-demo-first-mvp.md` govern D01.
- D01 uses fictional personas, synthetic local data, validated AsyncStorage persistence, deterministic reset, and a permanent demo disclosure.
- D01 must not be described as proof of real authentication, cloud synchronization, RLS enforcement, uploads, GPS, payments, identity verification, or AI inference.
- Production auth remains the default runtime and its deferred acceptance gates remain tracked as M03B.

## Exact next steps

1. Restart Windows to activate WSL/VirtualMachinePlatform, start Docker Desktop, and require a successful `docker info` before local database verification.
2. Run the local database reset, pgTAP, lint, generated-type drift, and HTTP integration checks below once the engine is ready.
3. Have the owner sign in with the explicitly authorized Google account configured in ignored `DEMO_ADMIN_EMAIL`. The latest hosted dry-run returned `user_not_found` / `require_user_login`; rerun it after account creation, verify the exact identity, and grant the admin role to that account.
4. Install and exercise the verified ARM64 APK on the physical Android device. Emulator launch does not establish physical-device acceptance.
5. Rehearse the two-principal hosted scenario in `docs/HOSTED_DEMO_SETUP.md` and the presentation in `docs/DEMO_RUNBOOK.md`; M03B hosted OAuth/device acceptance remains deferred.

## 2026-10-26 Section 11 execution attempt

- `npm ci` restored the locked dependencies.
- `npm run test:run` passed: 92 suites / 538 tests.
- `npm run format:check`, `npm run lint`, and `npm run typecheck` passed.
- `npx expo-doctor` passed 20/20 checks.
- `npx expo export --platform android` passed with telemetry disabled and produced the 4.9MB Hermes bundle.
- `npm run db:test` and `npm run test:auth:integration` were blocked because Docker is not installed/running and the disposable local Supabase database is unreachable.
- `npx supabase migration list` and `npx supabase db push --dry-run` were blocked because the repository is not linked to a Supabase project.
- Hosted project linkage was restored from ignored `.env.local`. The dry-run identified eight pending migrations, and `npx supabase db push` applied all eight migrations through `20261026000100_admin_roles_and_reporting.sql`; a follow-up migration list confirmed full local/remote parity.
- `supabase db dump --linked` could not capture the requested backup because the CLI requires Docker, which is unavailable.
- `node scripts/provision-demo-environment.mjs --hosted --dry-run` completed with the configured secret supplied under the script's required process-local `SUPABASE_SERVICE_ROLE_KEY` name. It reported no admin email configured and a missing counterpart worker with `create_and_onboard` as the planned action; no changes were applied.
- Hosted operator apply remains pending until the owner/admin email is explicitly configured. Do not infer it from unrelated credentials.
- Android preparation: the local SDK already contains configured `Pixel` and `Pixel_2` AVDs; `Pixel` booted successfully as `emulator-5554`. Native APK installation remains blocked by Windows CMake/Ninja path-length failures during React Native codegen, despite installing CMake 3.31.6 and retrying an arm64 release build from a real short-path copy.

## 2026-10-26 local build unblocking

- Docker Desktop `4.96.3`, Docker CLI `29.9.2`, and WSL `3.0.3` are installed. Docker Desktop was launched, but its engine is unavailable. WSL reports that a Windows restart is required to activate WSL/VirtualMachinePlatform. Firmware virtualization is enabled; local database and HTTP integration verification remain pending.
- Windows `LongPathsEnabled` is now `1`. The native build also uses `-Pexpo.android.cmakeObjectPathMax=240` so CMake hashes long object paths earlier; no dependency patch was required.
- The `x86_64` release build succeeded in 5m39s (879 tasks). Preserved artifact: ignored `.codex-artifacts/do-well-emulator-x86_64.apk`, SHA-256 `DFA8D1C18DB49360A3D8ECA02B1A2BD18168C3EFCFBEE63BE4FE3549D678A721`. APK v2 signature verification passed; installation returned `Success`; cold launch on `emulator-5554` returned `Status: ok` in 1526ms.
- The ARM64 release build succeeded in 2m46s; APK v2 signature verification and the native `arm64-v8a` library check passed. Preserved ignored artifact: `.codex-artifacts/do-well-android-arm64.apk` (35,343,354 bytes), SHA-256 `828BDAC6CC1582604941E7168D9A3E172A86ECE1CE3B201C438DAE8CD9311F06`. Both APKs use the generated development signing key. No physical phone is connected; physical-device installation and acceptance remain pending. Emulator launch evidence: ignored `.codex-artifacts/emulator-launch.png`.
- The focused secret-exposure suite passed (1 suite / 4 tests); `git diff --check` passed. No application source or dependencies changed, so the previous full-suite results were not rerun or reasserted as fresh.
- Hosted migration parity is already complete. Preserve the existing ignored configuration and linkage; inspect migration history rather than blindly relinking or reapplying those migrations. A new backup can be captured after Docker is ready, but cannot serve as a pre-apply backup for the migrations already applied.
- The owner supplied the authorized admin email after the build continuation. It is configured in ignored `.env.local` only. A fresh hosted provisioning dry-run returned admin `user_not_found` / `require_user_login` and worker `not_found` / `create_and_onboard`. The owner must sign in first to establish the Auth identity. No hosted provisioning apply, counterpart-worker creation, or admin grant occurred. No billing was enabled and no secrets were exposed.

## Suggested continuation commands

```powershell
git status --short --branch
git diff --check
docker info
npm.cmd run db:start
npm.cmd run db:reset
npm.cmd run db:test
npm.cmd run db:lint
npm.cmd run db:types:check
npm.cmd run test:auth:integration
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:run
```

## Stop conditions

Stop and update the active milestone issue instead of improvising if a step asks for a hosted Supabase link/apply, destructive remote migration, billing/payment setup, a privileged key in client code, history rewrite, production deployment, or an unresolved cancellation/agreement/retention decision.
