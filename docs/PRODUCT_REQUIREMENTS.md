# Product Requirements

## Purpose and authority

This document translates the approved Do Well Google Doc sections (`Main Desc.`, `Features & Technology`, `Phase 1 - Product & Wireframes`, and `Phase 3 - Backend & Auth`) and the approved Phase 3 brief into testable product requirements. It does not replace the source specification. The repository currently contains only the secure bootstrap, and the application has not been initialized (`README.md:3-7`).

Labels used below:

- **Confirmed**: explicitly approved product or technology direction.
- **Proposed**: an implementation default that still requires plan approval or a milestone feasibility result.
- **Open**: a decision that would materially change implementation.

## Goal and success criteria

**Confirmed goal:** deliver an Android-first marketplace that helps people in Makati and nearby Metro Manila post legitimate short-term paid gigs and helps workers discover and complete nearby or remote work.

The MVP succeeds when a new user can:

1. sign in with Google browser OAuth or email/password;
2. complete one profile and switch between worker and employer modes;
3. create a clear gig, manually or with a human-reviewed AI-generated draft;
4. discover local or remote gigs and understand why each is recommended;
5. apply, select exactly one worker, agree milestones, submit evidence, request revision or approve, and complete the gig; and
6. recover predictably from slow, intermittent, or unavailable network services without silent data loss or duplicate mutations.

## Users and roles

| Actor | Need | Authorization boundary |
|---|---|---|
| Guest | Understand the product and authenticate | No marketplace or private profile access |
| Worker | Find suitable gigs, apply, track assigned work, and submit evidence | Own profile, preferences, applications, assignments, and submissions; only public/published gig data |
| Employer | Publish gigs, review applicants, select a worker, manage milestones, and approve work | Only gigs they own and related applicants, assignments, milestones, and submissions |
| Signed-in user | Change active UI mode without creating another account | Mode affects navigation and defaults, not server authorization |
| Moderator/admin | Review reports and abuse signals | **Proposed/deferred:** no client-side admin surface in the MVP; elevated access must never use a public client key |

## Confirmed P0 scope

### Account and onboarding

- `PR-AUTH-01`: Support Google browser OAuth through Supabase and email/password sign-in.
- `PR-AUTH-02`: Restore valid sessions after app restart and handle refresh, expiration, cancellation, and retry explicitly.
- `PR-AUTH-03`: Create an application profile for every authenticated user and collect required onboarding fields before marketplace actions.
- `PR-AUTH-04`: One account supports both worker and employer modes; changing mode does not change identity or bypass authorization.

### Gigs and discovery

- `PR-GIG-01`: Employers can create, edit, publish, close, and view their gigs.
- `PR-GIG-02`: A gig distinguishes onsite from remote work. Onsite gigs use a privacy-preserving locality and coordinates suitable for distance filtering; precise private addresses are not public.
- `PR-GIG-03`: Published gigs expose a validated brief, compensation description, category, timing, location mode, and milestone expectations.
- `PR-DISC-01`: Workers can browse published gigs, filter local/remote and basic criteria, and see explicit recommendation reasons.
- `PR-DISC-02`: Nearby ranking works as a distance-sorted list even if an interactive map is unavailable. The product must not depend on paid Google Maps APIs.
- `PR-DISC-03`: Manual location selection remains usable when permission is denied or location is unavailable.

### Application-to-completion workflow

- `PR-WORK-01`: A worker can submit at most one active application per gig.
- `PR-WORK-02`: An employer can review applications only for their own gig and select one worker in the MVP.
- `PR-WORK-03`: Selection creates one assignment with agreed milestones through an atomic, retry-safe server operation.
- `PR-WORK-04`: Assigned participants can view state and append basic task updates/activity events.
- `PR-WORK-05`: The worker can submit work and optional image evidence; the employer can approve or request revision.
- `PR-WORK-06`: Completion is recorded only through valid server-enforced state transitions.
- `PR-WORK-07`: Duplicate taps, timeouts, and retries must not create duplicate applications, assignments, activity events, or submissions.

### AI Job Brief Builder

- `PR-AI-01`: When presented as AI-powered, the feature must perform genuine model inference. Deterministic templates are a clearly labelled fallback, not “AI.”
- `PR-AI-02`: Users enter minimal structured facts; model output is schema-validated, shown as an editable draft, and never published without explicit human confirmation.
- `PR-AI-03`: The model endpoint is authenticated, rate-limited, bounded by timeout/input/output limits, and logs no secrets or full personal data.
- `PR-AI-04`: Manual gig creation remains fully usable when inference is slow or unavailable.
- `PR-AI-05`: A hardware/network benchmark and license review must pass before choosing an inference provider. No paid API, payment method, promotional-credit dependency, or automatic overage is permitted.

### Android integration and resilience

- `PR-AND-01`: Use foreground location only for nearby discovery, request it in context, and support denial/permanent-denial recovery.
- `PR-AND-02`: Allow selection of image evidence with least-privilege permission handling and upload it to private storage.
- `PR-AND-03`: Local Android notifications are the baseline. Genuine remote push is optional until its value, credentials, and zero-cost operation are verified.
- `PR-NET-01`: Every asynchronous view has loading, empty, error, retry, and recovered states.
- `PR-NET-02`: Previously fetched discovery and assigned-work summaries may be read offline with visible stale/offline indicators.
- `PR-NET-03`: Gig, application, and submission forms preserve local drafts. Pending server actions show explicit state and retry controls.
- `PR-NET-04`: Reliable unattended/background synchronization is P1 and must not be implied by caching or drafts.

## Quality and policy requirements

| ID | Requirement | Evidence |
|---|---|---|
| `NFR-COST-01` | External-service spend remains PHP 0 / USD 0; no billing method or billing-dependent API | Cost review in every PR; free-tier checks recorded |
| `NFR-SEC-01` | Server-side authorization and RLS protect every user-owned table and private object | Negative RLS tests using distinct users |
| `NFR-SEC-02` | Privileged keys never enter the Expo bundle, Git, logs, screenshots, or issue/PR text | Secret scan plus bundle/config review |
| `NFR-VAL-01` | External input and model output are schema-validated at the boundary | Unit/contract tests for accepted and rejected inputs |
| `NFR-A11Y-01` | Core flows are keyboard/screen-reader labelled, have visible focus, and meet WCAG AA contrast where applicable | Component checks plus physical-device walkthrough |
| `NFR-REL-01` | Mutations are retry-safe; multi-row state changes are transactional | Unit/integration tests including repeated requests |
| `NFR-PERF-01` | Core screens remain usable on the competition device and under throttled connectivity | Recorded device and weak-network test matrix |
| `NFR-OPS-01` | A new session can resume from repository docs, issues, branch, and handoff without chat history | Recovery drill before competition release |
| `NFR-TEST-01` | Features are developed test-first and CI runs lint, typecheck, unit/integration tests, and build checks | Red/green evidence in commits and green PR checks |

## Explicitly deferred

- Payments, escrow, wallets, and automated payout.
- Full direct messaging/chat.
- Ratings and reviews.
- Identity verification, biometrics, face recognition, and background location.
- Multi-worker gigs.
- Mandatory interactive maps.
- General-purpose background/offline synchronization.
- Automated hiring or publishing model output without human approval.

## Product constraints

- Android is the competition target; physical Android device testing is mandatory.
- Phase 2 teammates own final UI/UX. Early milestone screens must use replaceable, clearly temporary presentation components.
- Exact competition eligibility, deadline, submission format, judging Android version/device, demo duration, and network conditions remain unverified.
- Supabase free offering is the only approved hosted backend. A local/export recovery path is required if the free project pauses or becomes unavailable.
- Public OpenStreetMap tiles are not an unrestricted production CDN. A map requires an approved provider/use policy; the list experience cannot depend on it.

## Open product decisions

| Decision | Recommended default | When it must be resolved |
|---|---|---|
| Exact onsite pilot boundary/radius | Store a configurable radius; default only after teammate/product approval | Before M06 acceptance |
| Gig categories and prohibited work | Small allowlist plus reporting; prohibit unsafe/illegal categories | Before M05 schema/validation freeze |
| Cancellation and dispute rules | Allow pre-assignment withdrawal/closure; defer post-assignment disputes to manual moderation | Before M08 state machine |
| Agreement confirmation | Require both participants to accept the same agreement version | Before M08 |
| Evidence retention | Private objects with documented retention/manual deletion procedure | Before M09 |
| Report moderation workflow | Capture reports in P0; manual admin review outside the mobile client | Before M14 |
| Competition framework eligibility | Treat Expo/React Native approval as a release gate | Before M01 native-build commitment |

## Traceability and change control

- Architecture mapping lives in `docs/ARCHITECTURE.md`.
- Data rules, authentication, security, AI, Android, offline, and cost details live in their focused documents and ADRs.
- Delivery state lives only in `docs/IMPLEMENTATION_ROADMAP.md` and `docs/SESSION_HANDOFF.md`; requirements are not marked implemented here.
- A scope or hard-to-reverse technology change requires a linked issue, updated affected documents, and an ADR when significant.
