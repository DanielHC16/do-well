# Professional mobile frontend redesign — 2026-10-31

The approved follow-up on `feat/frontend-marketplace` replaces competing promotional sections with a compact marketplace composition. Changes remain uncommitted. Earlier M21 changes already existed in the working tree; this report describes this follow-up, not every difference from main.

## Visual changes and files

- `src/shared/ui/theme.ts` and `src/shared/ui/index.tsx`: centralized indigo/lavender/off-white/mint palette, 26-point dashboard headings, smaller sections/cards, 48-point controls, restrained shadows, reusable original paper/icon empty states, and shared original-logo rendering. Confirmation dialogs respect safe areas and scroll content/actions together at large font sizes.
- `src/features/shell/components/{MarketplaceShell,AuthenticatedHomeScreen}.tsx`: compact logo/greeting/bell header, lighter bottom navigation with an active marker and weight change, one dashboard headline, distinct Find Work and Offer Work compositions. Search submits through its existing callback. Only supported categories are shown; On-site accurately names the existing work-mode filter. Employer published/draft/closed counts derive from returned listings, not fabricated statistics.
- `src/features/location/components/{LocationBar,LocationSelectorModal}.tsx`: compact optional area selector, explicit current/manual-location actions, readable system typography, selected locality/radius announced through accessibility value. Location remains opt-in; remote browsing is preserved.
- `src/features/gigs/screens/{GigFormScreen,EmployerGigDetailScreen}.tsx` and `src/features/discovery/screens/WorkerGigDetailScreen.tsx`: grouped white form sections, compact detail summaries, clear compensation/schedule hierarchy, consistent actions. Existing brief generation, validation, drafts, publication, and application callbacks remain.
- `src/features/assignments/screens/{WorkerAssignmentDetailScreen,EmployerAssignmentDetailScreen}.tsx`: compact contract summaries and clearer milestone presentation. Real progress, agreement, submissions, revisions, and approval callbacks remain authoritative.
- `src/features/shell/components/{AuthenticatedActivityScreen,AuthenticatedProfileScreen}.tsx`, `src/features/work/screens/MyWorkScreen.tsx`, `src/features/settings/screens/AccountSettingsScreen.tsx`: activity timeline/unread cues, status-led work rows, neutral profile summaries, and settings groups.
- `src/features/profile/components/{OnboardingForm,ProfileEditor}.tsx`: consistent grouped forms and supporting labels.
- `src/features/auth/components/AccountAccessScreen.tsx`: smaller logo placement and inherited design-system consistency; existing auth UI and Google/email integration preserved.
- `src/features/submissions/evidence/components/EvidenceAttachmentPicker.tsx`: replaces references to unloaded Inter families with explicit native system weights.
- `src/shared/runtime/{DevelopmentToolsPresentation,RootRuntime}.tsx`: existing Expo development-client runtime API hides the floating development-tools gear that overlapped the header. The development menu remains available through development tooling. Release rendering, navigation containers, and native configuration are unchanged.
- Related component/route tests verify existing workflows alongside new composition, selected locality announcements, honest filter wording, and development-only presentation behavior. Shared confirmation dialog accessibility is covered separately.

## Assets and dependencies

The owner's `Do Well App LOGO.svg` replaces the old in-app logo. Its original bytes remain untouched. Its embedded raster/filter combination rendered blank through Android's SVG decoder, so `branding/do-well-app-logo.png` is a faithful locally browser-rendered 512px rendition, displayed with contain sizing and a white circular surface. No logo tracing/recoloring occurred. Native launcher/splash assets remain unchanged.

Existing Expo Image, Expo Symbols/Material Symbols, native system text, React Native views, and shared press feedback provide the imagery and interactions. Original empty-state compositions avoid network assets and animation loops. No dependency, font download, paid service, backend, environment, schema, RLS, credential, or native configuration change was introduced by this follow-up. See `branding/ASSET_SOURCES.md` for sources/licenses.

## Verification and boundaries

Android 16 Development Build inspected at 411dp/100% text and 360dp/150% text. Confirmed new logo display, dashboard wrapping, role switching, and responsive navigation; the grouped gig form and Profile were also inspected at default size. Temporary density/font changes were restored. Existing Activity recreation can reproduce the previously documented Expo/Fabric routing-queue warning; cold process restart recovers without data reset or native rebuild. This UI work does not claim to fix that framework lifecycle issue.

No real authentication request, gig publication, application, selection, profile save, or approval was submitted during visual inspection. Component tests retain these callbacks and assertions; complete real two-account acceptance, TalkBack, docked keyboard/back handling, permission-denial flows, and populated-list device inspection before release. Unsupported skills/reviews/profile fields remain as previously documented rather than invented.

Final verification after reviewer fixes: formatting, ESLint, strict TypeScript, and **102 Jest suites / 614 tests passed**. `git diff --check` passed (only existing line-ending notices). No diff exists for Supabase files, package/lockfile, or AuthProvider. Existing earlier M21 working-tree changes are retained. JSON test evidence is local under `.codex-artifacts/redesign-final-tests.json`; emulator captures are also in that ignored directory.

## Run and review

```powershell
npm.cmd start
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:run
```

Reload the existing Android Development Build or use Fast Refresh. No prebuild, native reset, or Android rebuild is needed for this follow-up. `npm.cmd run android` remains the existing build/run command only when a rebuild is intentionally needed. No commit, push, PR, or merge was performed.
