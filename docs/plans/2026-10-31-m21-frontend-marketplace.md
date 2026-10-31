# M21 — Frontend marketplace refinement

**Status:** `IN PROGRESS` on `feat/frontend-marketplace`.

**Authorization:** the project owner's 2026-10-31 frontend task supplies the product scope, design direction, architecture constraint (reuse the existing Expo Router application), acceptance requirements, and explicit backend preservation boundary. This plan records that scope; it does not authorize backend changes, paid services, deployment, or merging.

## Repository inspection

- Runtime: Expo SDK 58, React Native 0.88, React 19.3, strict TypeScript, Expo Router file routes in `app/`, Jest 30 / `jest-expo` / React Native Testing Library 14.1.
- Production entry: `app/_layout.tsx` composes `RootRuntime`; public, onboarding, and protected layouts enforce the existing auth/profile gates. Feature screens live under `src/features/`; routes remain thin composition files.
- Styling: React Native `StyleSheet`, shared `setupTheme`, and `marketplaceStyles`. No Tailwind or query-state package is installed; preserve the established architecture and dependencies rather than introduce a competing styling or state stack.
- Client boundary: `src/shared/api/supabase.ts`, public configuration validation, bounded network adapter, and feature gateways. Existing AuthProvider, ShellModeProvider, ConnectivityProvider, cache, and draft stores retain ownership of their current state.
- Actual logo: repository-root `Do Well LOGO.png`, a square image with white geometric lettering on indigo and a white outer margin. Use the original file, `contain` sizing, and its original aspect ratio; do not trace, recolor, crop, or fabricate a replacement.
- Existing navigation: worker/employer homes, gig details, creation, assignment details, activity, profile/settings, reporting, and authorized administration. Demo routes remain explicitly isolated from production.

## Verified integration inventory

| Product flow | Existing implementation and authorization |
| --- | --- |
| Sign in / session / onboarding | `AccountAccessScreen` with email sign-in/sign-up and Google browser OAuth through AuthProvider; existing PKCE/callback guards, `ensure_profile`, and `complete_onboarding` |
| Discovery / search | `discoveryGateway` calls `discover_gigs`, including `p_search_query`, category, work mode, coordinates, radius, limit, and offset |
| Gig creation / lifecycle | `gigGateway` draft CRUD, `publish_gig`, `close_gig`; existing validated PHP budget, category, work mode, public locality, application deadline, and due date |
| Applications / selection | `apply_to_gig`, `withdraw_application`, `list_gig_applicants`, `get_worker_application_for_gig`, `select_worker_atomic`; selection remains an explicit employer action |
| Work agreements | Assignment gateway detail, confirmation, decline, and cancellation operations |
| Milestones / submissions | Existing milestone creation/start/list, submission, evidence, revision, and approval operations; server-confirmed status stays authoritative |
| Activity / notifications | `list_user_activity`, `mark_activity_read`, existing local notification permission/channel/deduplication services |
| Workspace preference | Existing settings route and persisted default-mode operation |
| Profile | AuthProfile currently projects name and public area. Existing `profiles_update_own` policy and column grants permit editing name, bio, public area, avatar path, and preferred mode; no new backend is required for a validated frontend adapter over those supported columns |
| My Work aggregate | Existing authenticated SELECT grants and RLS permit own applications, participant assignments, and related/own gigs. A bounded, schema-validated frontend read adapter may use these existing tables; no RPC or schema change is necessary |

Evidence comes from the actual feature gateways/schemas, generated database types, and migrations `20261022000100_schema_foundation.sql` and `20261022000200_authorization_foundation.sql`, with subsequent workflow migrations governing transitions.

## Architecture and implementation boundaries

1. Centralize indigo, mint accent, neutral surfaces, readable text, spacing, typography, radii, component sizes, and restrained elevation. Retain the `setupTheme` compatibility surface so existing feature screens inherit the identity without a rewrite.
2. Build accessible typed React Native primitives under `src/shared/ui/` and consume them in revised screens. Use existing native typography unless a bundled font already exists; do not introduce a network font dependency.
3. Keep route groups, session restoration, Google OAuth, authorization, credential loading, API contracts, and database operations intact. Current `app/(public)/sign-in.tsx` uses `AccountAccessScreen` with both email sign-in/sign-up and Google OAuth; this supersedes older handoff prose about Google-only UI. Refine those existing flows and add password visibility. Password-reset requests exist in AuthProvider, but no reset-password route currently exists; expose recovery only when its full callback and password-update path is supported, without inventing provider configuration.
4. Refine the shared shell and supported screens. Home combines genuine greeting, search, category/work-mode controls, location opt-in, real cards, and useful loading/empty/error/retry states. My Work links into existing detail flows and uses actual server statuses.
5. Keep optional nearby permission intentional; remote and manual locality browsing work without granting device location. Show only actual approximate areas/distances supplied by the existing contracts.
6. Reuse existing notification services and settings. Do not add notification infrastructure, request permissions at startup, or fabricate unread counts.
7. Preserve local drafts, bounded requests, stale indicators, idempotency, and safe error handling. Production never imports demo listings or reports success before a gateway operation confirms it.
8. Keep payments, escrow, fees, automatic selection, new backend services, migrations, RLS changes, credentials, and dependencies outside this milestone.

## Acceptance criteria

- The new branch is based on local `main`, and backend/configuration contracts remain preserved.
- Logo use preserves the original file and aspect ratio; primary actions and text have readable contrast with mint reserved for accents.
- Shared controls support accessible names, adequate touch targets, disabled/loading states, and consistent indigo styling.
- Authentication remains functional through its existing service, with clear pending/error/retry feedback and concise optional product introduction.
- Discovery search and filters reach supported backend inputs. Failures are distinguishable from a successful empty result and provide retry; remote browsing works without GPS.
- Gig creation/details, applicant review, agreements, milestones, submissions, activity, profile/settings remain reachable through existing routes and server-authorized operations.
- My Work uses actual application/assignment/listing statuses and links to actionable detail pages; it never treats a client toggle as server completion.
- Forms respect safe areas, scrolling, and keyboard behavior; primary navigation and back actions remain clear on Android.
- New behavior follows test-first implementation. Run formatting, lint, strict typecheck, and the full Jest suite, plus Android export where available. Record exact outcomes and any pre-existing or environment blockers.
- Report only actual Android emulator/device testing. A bundle export is build validation, not device acceptance.
- Update the session handoff and roadmap with verified branch state; leave review/merge pending owner approval.

## Honest capability limits

- There are no structured profile skills, experience, ratings, or review contracts. Do not render invented values. Skill requirements and deliverables may be described in existing free-text descriptions, while structured work steps use existing milestones.
- Profile bio and avatar path exist in the schema but are absent from the present AuthProfile projection. Avatar upload/storage support is not established; initials are a valid fallback without pretending an upload succeeded.
- The default brief gateway uses `DeterministicTemplateProvider` (`rule-based-template-v1`) and returns `isFallback: true`. A local inference adapter exists but no primary provider is configured. Retain the existing editable template builder and label it honestly; do not advertise live AI inference or invent a backend AI function.
- Current product UI supports email sign-in/sign-up and Google OAuth. Hosted password recovery acceptance and its reset-password route are not established; a reset-request method alone does not prove an end-to-end recovery flow.
- Existing activity drives local alerts; remote push and a separate notification backend are outside scope.
- Live GitHub issue/PR inspection is blocked by unauthenticated `gh`. Prepare reviewable local changes and report the limitation without creating fictional issue/PR links.

## Delivery and verification record

Implementation proceeds through inspection, design system, navigation/authentication, marketplace, work management, and integration/refinement. The final report and session handoff will record actual changed files, commands, results, limitations, and next acceptance work. This plan is not evidence of completed implementation or physical-device validation.
