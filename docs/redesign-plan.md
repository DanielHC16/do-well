# Do Well frontend redesign plan ("soft productivity")

Status: **Proposed. Awaiting project-owner approval.** Nothing below is implemented yet.
Scope: visual and UX only. No change to Supabase schema, RLS, RPCs, queries, auth, or business logic.

## 1. Repository audit (verified 2026-10-31)

| Area | Current state |
|---|---|
| Routes | Expo Router. `app/(public)` sign-in/auth, `app/(onboarding)`, `app/(protected)` with `worker.tsx`, `employer.tsx` (Home per mode), `work.tsx`, `activity.tsx`, `profile.tsx`, `worker/gigs/[gigId]`, `worker/assignments/[assignmentId]`, `employer/gigs/{new,[gigId]}`, `employer/assignments/[assignmentId]`, `reports`. `app/(demo)` is the isolated offline demo runtime. |
| Tab bar / header | Not Expo Router `Tabs`. Each screen renders `MarketplaceShell` (`src/features/shell/components/MarketplaceShell.tsx`), which draws the logo header, bell, page title, Find/Offer toggle, `OfflineBanner`, and a custom 4-item bottom bar that navigates with `router.push/replace`. |
| Mode state | `ShellModeProvider` / `useShellMode` (`src/features/shell/context`), persisted per user in AsyncStorage (`shell-mode-store.ts`). `switchMode()` then `router.replace` to `/worker` or `/employer`. |
| Styling | React Native `StyleSheet` + one token object `setupTheme` in `src/shared/ui/theme.ts` (lavender/indigo), re-exported from `src/features/setup/setupTheme.ts`. 44 files import it. No NativeWind/Tailwind. |
| Components | `src/shared/ui/index.tsx`: `BrandLogo`, `AppText`, `AppButton`, `AppInput`, `ProfileAvatar`, `StatusBadge`, `FilterChip`, `SectionHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ConfirmationModal`, `ScreenContainer`. Feature screens also carry large local stylesheets. |
| Fonts | Inter (4 weights) bundled under `branding/fonts`, loaded by `TypographyProvider` (`src/shared/ui/Typography.tsx`), which holds a spinner until fonts load. Splash is not held. |
| Icons | `AppIcon` wraps `expo-symbols` (Material Symbols on Android). Kept. |
| Installed and usable | `react-native-reanimated` 4.7, `react-native-gesture-handler`, `expo-image`, `expo-image-picker`, `expo-splash-screen`, `@expo/ui`. |
| **Not installed** | `@expo-google-fonts/outfit`, `react-native-svg`, `@shopify/flash-list`, any bottom-sheet or date-picker library. |

## 2. Load-failure diagnosis

### Root cause: the emulator has no internet (environment, not code)

Evidence from `adb` on `emulator-5554`:

- Android's own connectivity probes fail continuously: `UnknownHostException: Unable to resolve host "www.google.com"`, also for `connectivitycheck.gstatic.com`, `play.googleapis.com`, and `android.googleapis.com`.
- `adb shell ping -c 2 8.8.8.8` → **100% packet loss**.
- The host machine is online (`https://supabase.com` → 200).
- `.env.local` points to the **hosted** `*.supabase.co` project, which has full migration parity per `SESSION_HANDOFF.md`. So this is not a missing local Docker stack, an RLS gap, or a schema mismatch.

How each symptom follows from that:

| Screen | What happens |
|---|---|
| Home | `discover_gigs` fails, and the gateway falls back to the user-scoped cache. That is why it shows "Saved snapshot: 7:34 PM" at 3:04 with no gigs. |
| My Work | `workGateway.list` has **no cache fallback**. After the 12 s `withTimeout` it throws, and every cause (network, RLS, parse) is collapsed into "We couldn't load your work". |
| Activity / Profile | Same 12 s timeout, so the screenshots caught the loading phase. Both reach an error state after about 12 s. |
| Offline banner | Never appears. `expo-network` reports Wi-Fi connected and internet reachable on the emulator even though DNS is broken, so `isOffline` stays `false`. |

**Environment fix (no code):** cold-boot the AVD (Device Manager → ⋮ → Cold Boot Now). If DNS still fails, start it with `emulator -avd Pixel -dns-server 8.8.8.8,1.1.1.1`. Check that no host VPN or firewall is blocking the emulator's NAT. Verify with `adb shell ping -c 2 8.8.8.8` before retesting the app.

### Frontend-only hardening (proposed, not applied)

Real users on weak networks will hit the same symptoms, so these are worth doing:

1. **Typed load errors.** Gateways keep their existing calls but tag thrown errors as `offline | timeout | unauthorized | server | invalid` using the existing `isNetworkOrTimeoutError`. Screens show the right `ErrorState` copy ("You're offline", "Taking too long", "Sign in again"). The user-facing contract stays the same.
2. **Request-driven offline signal.** When a gateway request fails with a network error, call a new `reportNetworkFailure()` on `ConnectivityProvider`. That marks the app offline until the next successful request or connectivity event, so the banner and stale captions are honest even when `expo-network` is wrong.
3. **My Work stale cache.** Reuse the existing user-scoped `cache-store` that discovery already uses, with the same partitioning and purge on sign-out. My Work then shows "Updated 7:34 PM · offline" instead of a dead end.
4. **Profile renders from the auth profile immediately.** The background refresh shows a field-level skeleton only. "Edit profile" stays disabled until the read succeeds, as today. It is not a blocking spinner.

None of these require backend changes. Item 3 touches a gateway's read path (adding a cache read), so it needs your explicit OK.

## 3. Design system

### Tokens: new `src/theme/` (single source of truth)

`colors.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `elevation.ts`, `motion.ts`, `index.ts`. They use the exact palette, type scale, 4-pt spacing, radii, and elevation from the brief. Status colors come as `{ fg, bg (≈12% tint), border }` triplets.

Migration: `src/shared/ui/theme.ts` becomes a temporary shim that maps old `setupTheme` keys onto the new tokens. That gives the whole app the new palette in Phase 1 without editing 44 files at once. Phase 5 deletes the shim and every lavender value.

Contrast check against WCAG AA (≥ 4.5:1 body text):
- `primary900` on `bg`: passes.
- `textSecondary` #5E6B66 on white: about 5.6:1, passes.
- `textTertiary` #9AA5A0 on white: about 2.5:1, **fails**. It is used only for non-essential decoration or disabled text, never for meaningful copy.
- Status `fg` on its tint: success #2E9B6A and warning #E58A2B fail on white at body size. The badges use darkened text variants (≈ #1F6F4B / #9A5410) and keep the brief's hues for dots and borders.

### Fonts

Outfit 400/500/600/700, replacing Inter. `TypographyProvider` holds `expo-splash-screen` until the fonts are ready, with a system-font fallback if loading fails. The two options are in section 6, decision D2.

### Components

New components go in `src/components/ui/` as requested. Each one is typed, uses only tokens, has `accessibilityRole`/`accessibilityLabel`, a 48 dp minimum target, Android ripple via `Pressable android_ripple`, and press-scale 0.98 that respects reduce-motion.

| New component | Replaces / notes |
|---|---|
| `Screen` | `ScreenContainer` and per-screen `ScrollView`s; edge-to-edge with safe areas, `RefreshControl` built in |
| `AppHeader`, `ModeSwitch` | Header and big toggle inside `MarketplaceShell` |
| `TabBar` + `Fab` | Custom bottom bar inside `MarketplaceShell` |
| `PrimaryButton`, `SecondaryButton`, `IconButton` | `AppButton` variants |
| `TextField`, `TextArea`, `SelectField`, `DateTimeField`, `TagInput` | `AppInput` and the ad-hoc inputs in `GigFormScreen` |
| `FilterPill`, `SegmentedPills` | `FilterChip`, My Work tabs, mode chips |
| `StatusBadge`, `PriorityDot` | Existing `StatusBadge`. Maps the real backend statuses (below) |
| `StatTile`, `ProgressHeroCard` | Employer metric cards on Home |
| `GigCard`, `TaskCard`, `MilestoneTimeline`, `WeekStrip` | Inline card markup in Home, My Work, and assignment screens |
| `AISuggestionCard` | Brief result fields in `AiJobBriefModal` |
| `Avatar`, `AvatarStack` | `ProfileAvatar` |
| `BottomSheet` | Built on RN `Modal` + Reanimated (no new dependency) |
| `Skeleton`, `EmptyState`, `ErrorState`, `Toast` | `LoadingSkeleton`, `EmptyState`, `ErrorState`. Fixes the double "unavailable" text plus error card |

`ProgressHeroCard` donut: see section 6, decision D3.
Lists: optimized `FlatList` (`keyExtractor`, memoized rows, `getItemLayout` where heights are fixed, `windowSize` tuned). No FlashList dependency.

## 4. Screens and data mapping

Honest-data rule: every element below is either backed by existing fetched data or is omitted and marked `// TODO(data):`. The UI never fakes a value.

| Brief element | Backed by today? | Plan |
|---|---|---|
| Worker tiles: Applied · In progress · Due soon | Yes, from My Work lists (`applications`, `assignments`, `due_at`) | Counts from existing gateway pages (first 20; label "20+" when a page is full) |
| Worker tile "Shortlisted" | **No.** Application statuses are `pending/withdrawn/accepted/rejected/declined`. There is no shortlist state | Replace with **"Selected"** (`accepted`). Shortlisting needs backend work → section 6, decision D4 |
| Employer tiles: Active posts · In progress · Awaiting review | Yes (`gigs.status`, assignment `active`/`submitted`) | Real counts |
| Employer tile "New applicants" | Only per gig (`list_gig_applicants`) | `TODO(data)`. The tile is hidden until an aggregate read exists (avoids N+1 calls) |
| Gig card pay, distance, area, Remote, reasons | Yes (`discover_gigs` returns coarse area/distance and reason chips) | "Why this fits" uses the **existing server reasons** ("Within 5 km of you", "Remote") |
| "Matches 3 of your skills", skill chips, rating, priority, tags | **No** skills/rating/priority/tags in schema | Omitted with `TODO(data)`. The PriorityDot and TagInput components are built but not wired |
| TaskCard progress % | Yes (milestones approved / total on assignment detail) | My Work list shows status only. % appears where milestones are loaded |
| Avatar stack, updates count | No per-card participants or messages | Omitted with `TODO(data)` |
| Profile avatar image | `avatar_path` column exists, no upload flow | Initial fallback only |
| Exact address before selection | Never fetched by discovery (coarse `public_area` only) | Preserved |
| AI label | `AiJobBriefModal` labels by provenance: "AI DRAFT · model" vs "MANUAL TEMPLATE DRAFT" (live inference not configured) | `AISuggestionCard` keeps the **conditional** label: "✨ Suggested by AI · review before posting" only when `meta.isFallback === false`, otherwise "Template suggestion · review before posting". Required by `tests/security/truth-in-advertising.test.ts` |
| ₱ formatting | Existing en-PH formatting | Centralized `formatPeso()` in `src/theme`-adjacent utils |

### Screens

1. **Global shell (Phase 2):** `MarketplaceShell` keeps its role and API but renders `AppHeader` (teal, radius-28 bottom, avatar → Profile, "Hi, {name}" + screen name, search/bell icon buttons; the unread dot uses the existing activity read state) and `TabBar` with a centered FAB. Mode switching animates and keeps existing `switchMode` + route replace. Per-screen toggles are removed. FAB: Offer → `/employer/gigs/new`. Find → BottomSheet with "Find gigs near me" (location flow) / "Browse remote" (sets the existing Remote filter).
2. **Home, Find work:** stat tiles, search with inline filter icon → BottomSheet (category, ₱ range, schedule only where the gateway already supports the filter), All/On-site/Remote pills that fit the width, location chip with the existing permission states, `GigCard` list, "Updated 7:34 PM" caption, pull-to-refresh, empty state with Reset filters / Try Remote gigs.
3. **Home, Offer work:** tiles, `ProgressHeroCard` (this week's milestones, only where already loaded, otherwise the hero shows active/awaiting counts), "Your gigs" `TaskCard` list, empty state → FAB flow.
4. **My Work:** `SegmentedPills` per mode (Applications/Active/Completed; Posted/In progress/Completed), mapped to existing `WorkSection` values. `TaskCard` list opens the existing detail routes.
5. **Task workspace** (`Worker/EmployerAssignmentDetailScreen`): restyled around `WeekStrip` (from milestone `due_at`) + `MilestoneTimeline`, existing submit/evidence/approve/revision handlers, sticky bottom action. "Updates thread" shows recent activity events for this assignment where already loaded; otherwise omitted.
6. **Gig details** (worker + employer): pay/status hero, deliverables, schedule, approximate area label (no map, which matches ADR 0007 list-first), employer row, sticky Apply. The employer view keeps the applicants list and atomic **Select** with confirmation. **Shortlist depends on D4.**
7. **Post a gig / Job Brief Builder:** the existing `GigFormScreen` + `AiJobBriefModal` logic is restructured into a 4-step flow (Describe → Suggestions → Details → Review → Post) using the same gateway calls and draft store. Priority pills and tags are omitted unless D4 adds the columns.
8. **Activity:** grouped Today / Earlier, icon per `event_type`, unread dot (existing `read_at`), dismissible teal banner only while notifications are off (dismissal stored per user locally).
9. **Profile:** large avatar, name, area, bio, "Your work" stats, Edit profile secondary button, settings list. The eyebrow and subtitle are removed. Rating, skills, availability, and preferences are `TODO(data)` placeholders, hidden rather than faked.
10. **Auth / onboarding:** restyle only.

## 5. Phasing and verification

Phases 1–5 as in the brief. After each phase: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:run`, then an emulator check at 360×640 dp and 412×915 dp and font scale 1.3. Tests are updated or added test-first per `AGENTS.md`, using Jest + React Native Testing Library. Existing behavior tests keep asserting the same gateway calls.

## 6. Decisions needed before Phase 1

- **D1. Baseline.** `feat/frontend-marketplace` holds ~47 uncommitted modified files (≈5.8k lines of M21 work). Recommendation: commit that M21 state first (or a WIP checkpoint), then do the redesign on a new branch `feat/frontend-redesign-soft-productivity` (milestone M22) so the redesign diff is reviewable on its own.
- **D2. Outfit source.** (a) add `@expo-google-fonts/outfit` (JS-only, no native rebuild; new dependency + lockfile change), or (b) bundle the 4 OFL Outfit TTFs under `branding/fonts` like Inter, with licenses in `branding/licenses`. Recommendation: (b), which matches the existing pattern and adds no dependency.
- **D3. Donut chart.** `react-native-svg` is a **native module**: it requires a new dev-client build, and local Android builds previously hit Windows CMake path-length failures (handoff). Recommendation: render the donut with Reanimated + two rotated half-circle `View`s (no dependency), with the same visual result. Add `react-native-svg` only if you accept a rebuild.
- **D4. Backend-dependent features.** Shortlisting, skills, ratings, priority, and tags need schema/RPC changes, which are out of scope for this redesign. Recommendation: ship the UI without them (marked `TODO(data)`) and scope them as a separate backend milestone if wanted.
- **D5. Component location.** The brief says `src/components/ui/`, but the repo convention is `src/shared/ui/` (44 importers). Recommendation: honor the brief for new components, keep `src/shared/ui/index.tsx` as re-exports during migration, and remove it in Phase 5.
- **D6. Date/time field.** No date-picker library is installed. Recommendation: `@expo/ui` (already installed) Android date/time picker if it works in the current dev build, otherwise keep the existing text-based due-date entry restyled.
- **D7. Load-failure hardening.** Approve items 1–4 in section 2 (frontend-only; item 3 adds a cache read to `work-gateway`).

## 7. Risks

- Large surface (≈30 screens/components) on a branch that already carries uncommitted work → mitigated by D1 and per-phase verification.
- Font swap changes text metrics everywhere. The 1.3× scale check is run on every phase.
- The temporary theme shim could let lavender values linger. Phase 5 adds a test that greps `src/` and `app/` for removed hex values.
- Demo runtime (`app/(demo)`) shares components and will restyle with them. Its disclosure banner stays.
- Reanimated animations must respect `AccessibilityInfo.isReduceMotionEnabled`.
- Native-only items (splash appearance, icon) still need a dev-client rebuild to verify on device.
