# Decision Register

This is the project-wide index and status log. It helps a new session find the governing record; it does **not** replace an Architecture Decision Record (ADR), requirement, migration, or external-service configuration. ADR lifecycle rules and links are maintained in `docs/adr/README.md`.

## Status meanings

- **Confirmed:** explicitly approved in the product/Phase 3 brief; implementation must comply.
- **Proposed:** recommended architecture awaiting explicit plan/ADR approval.
- **Experiment required:** no implementation selection until the named feasibility gate passes.
- **Open:** product or external decision is still required.
- **Deferred:** intentionally outside P0.
- **Superseded:** retained for history and linked to its replacement.

## Confirmed decisions

| ID | Date | Decision | Consequence / implementation gate | Governing record |
|---|---|---|---|---|
| `C-001` | 2026-10-21 | Build an Android-first short-term paid-gig marketplace for Makati/nearby Metro Manila, with remote gigs supported. | Nearby behavior needs a configurable pilot boundary; remote mode must not require location. | `docs/PRODUCT_REQUIREMENTS.md` |
| `C-002` | 2026-10-21 | One authenticated account operates in worker and employer modes. | Mode is presentation/state only; server authorization uses ownership/participation. | `docs/PRODUCT_REQUIREMENTS.md`, `docs/SECURITY_AND_RLS.md` |
| `C-003` | 2026-10-21 | The MVP hires one worker per gig. | Enforce with database uniqueness and an atomic selection operation, not UI checks. | `docs/DATABASE_SCHEMA.md` |
| `C-004` | 2026-10-21 | Use React Native + strict TypeScript, Expo development builds, and Expo Router. | Expo Go is not the acceptance target; M01 pins compatible versions and proves a physical Android build. | `docs/adr/0001-expo-supabase-modular-architecture.md` (architecture details proposed) |
| `C-005` | 2026-10-21 | Use Supabase Auth/PostgreSQL/RLS, private Storage, and Edge Functions only where justified. | Stay within the free offering; every protected table/object requires server-side policy tests. | `docs/DATABASE_SCHEMA.md`, `docs/SECURITY_AND_RLS.md` |
| `C-006` | 2026-10-21 | Support Google browser OAuth and email/password. | Google redirects to Supabase HTTPS callback; the app receives an allow-listed deep link. No provider secret ships in the client. | `docs/adr/0002-browser-oauth-and-deep-linking.md` (mechanics proposed) |
| `C-007` | 2026-10-21 | External-service spending is permanently capped at PHP 0 / USD 0. | No cards, billing-dependent services, promotional-credit dependency, paid AI, or automatic overage. Every PR includes a cost review. | `docs/FREE_TIER_AND_COST_POLICY.md` |
| `C-008` | 2026-10-21 | AI Job Brief Builder is a differentiator, but its output is an editable draft requiring human approval. | Genuine model inference is required for the AI label; manual creation remains complete. | `docs/AI_STRATEGY.md` |
| `C-009` | 2026-10-21 | Payments, escrow, chat, ratings, identity verification, background location, and multi-worker gigs are outside P0. | Do not add supporting services/schema/UI without approved scope change. | `docs/PRODUCT_REQUIREMENTS.md` |
| `C-010` | 2026-10-21 | Final UI/UX comes from Phase 2 teammates. | Architecture work may use replaceable temporary UI; do not invent permanent branding/wireframes. | `docs/PRODUCT_REQUIREMENTS.md` |
| `C-011` | 2026-10-21 | All substantial post-bootstrap work uses a short-lived branch, linked issue, reviewed PR, and user-approved merge. | M00 safe bootstrap is the sole direct-to-main exception. | `docs/DEVELOPMENT_WORKFLOW.md` |
| `C-012` | 2026-10-25 | Prioritize an isolated offline Demo Preview before completing hosted authentication. | The demo uses synthetic local data and a visible disclosure; it does not weaken or claim completion of production authentication, authorization, or cloud workflows. | [ADR 0006](adr/0006-explicit-local-demo-runtime.md) |
| `C-013` | 2026-10-25 | Foreground one-shot location with list-first nearby discovery; no interactive map or billing-dependent tile CDNs in MVP. | Verified zero-cost architecture with zero external card risk; GPS fix or curated Metro Manila localities feed SQL Haversine query. | [ADR 0007](adr/0007-foreground-location-and-list-first-discovery.md) |

## Architecture proposals awaiting approval

| ID | Date | Proposed decision | Why / validation gate | ADR |
|---|---|---|---|---|
| `P-001` | 2026-10-21 | Use an Expo/Supabase modular monolith; TanStack Query for server state, narrow React Context for session/mode/connectivity, and Zod at boundaries. | Lowest operational complexity; M01 proves library/SDK compatibility and Android build. | [ADR 0001](adr/0001-expo-supabase-modular-architecture.md) — Proposed |
| `P-002` | 2026-10-21 | Use `dowell://auth/callback` and Android package `com.anghulingpullrequest.dowell`; server-provision the minimal profile. | Stable identity is needed before provider/native configuration; M03 validates OAuth/session lifecycle. | [ADR 0002](adr/0002-browser-oauth-and-deep-linking.md) — Proposed |
| `P-003` | 2026-10-21 | Make discovery list-first with bounded Haversine distance filtering and manual location; make an interactive map optional. | Preserves P0 with no paid or unreliable tile dependency; PostGIS is added only if M06 query evidence proves it necessary, and M11 separately proves any map-provider constraints. | [ADR 0003](adr/0003-zero-cost-nearby-discovery.md) — Proposed |
| `P-004` | 2026-10-21 | Separate cached reads, persisted drafts/pending actions, and background synchronization; defer general background sync. | Avoids false offline claims and unsafe write replay; M13 runs physical-device failure matrix. | [ADR 0005](adr/0005-offline-capability-boundaries.md) — Proposed |
| `P-005` | 2026-10-21 | Use local notifications for P0; evaluate remote push only as a separately justified, verified-free enhancement. | Delivers device value without Firebase/FCM credential and network complexity. | ADR required before remote push is introduced |
| `P-006` | 2026-10-21 | Use direct RLS-protected queries for simple CRUD, SQL RPCs for multi-row/state transitions, and Edge Functions only for AI or privileged external operations. | Keeps authorization close to data and transactions atomic without an unnecessary API service. | Covered at system level by ADR 0001; database/security detail in focused docs |
| `P-007` | 2026-10-21 | Keep image evidence in a private Storage bucket with short-lived authorized access and explicit retention. | Prevents public evidence URLs and cross-user access; M02/M12 require negative policy tests. | ADR required when retention and deletion semantics are approved |

## Experiment-required decisions

| ID | Gate | Current recommendation | Pass/fail consequence | Record |
|---|---|---|---|---|
| `E-001` | M10 benchmark on actual laptop/network/phone | Pinned local Ollama/open-weight model behind a restricted authenticated LAN gateway; deterministic manual fallback | Adopt only if quality, schema validity, latency, reliability, license, privacy, and offline access pass. Otherwise mark AI delivery blocked and do not mislabel fallback. | [ADR 0004](adr/0004-zero-cost-ai-inference.md) — Proposed |
| `E-002` | M11 native/provider feasibility | List-first nearby discovery confirmed; MapLibre deferred as optional non-blocking overlay | Map is optional and can be disabled without harming discovery. Public OSM Standard tiles are not a production/offline CDN. | [ADR 0003](adr/0003-zero-cost-nearby-discovery.md), [ADR 0007](adr/0007-foreground-location-and-list-first-discovery.md) — Confirmed |
| `E-003` | M01 compatibility spike | Target the current approved Expo/JDK/Android combination named in ADR 0001 | If critical native compatibility fails, document and time-box an older supported Expo exception; never silently drift versions. | [ADR 0001](adr/0001-expo-supabase-modular-architecture.md) — Proposed |

## Open decisions and owners

| ID | Decision needed | Recommended default | Deadline / owner |
|---|---|---|---|
| `O-001` | Official competition framework eligibility, deadline, artifact format, judging API/device, demo duration, and network | Treat as a release gate; prepare manual/offline demo fallback | Project owner before M01 commitment; all details before M14 |
| `O-002` | Exact local pilot radius/boundary | Configurable distance plus locality; no hard-coded permanent value | Product team before M06 acceptance |
| `O-003` | Allowed/prohibited gig categories | Small allowlist with safety copy and reporting | Product team before M05 schema freeze |
| `O-004` | Pre/post-assignment cancellation and disputes | Allow pre-assignment withdrawal/closure; manual moderation for P0 disputes | Product team before M08 |
| `O-005` | Agreement acceptance semantics | Both participants accept the same immutable agreement version | Product team before M08 |
| `O-006` | Evidence retention/deletion | Private, minimum necessary retention with a documented operator process | Product/security owner before M09/M12 |
| `O-007` | Report review process | Capture reports; manual trusted-operator review outside the mobile client | Product/security owner before M14 |
| `O-008` | GitHub repository-local author email | Use verified owner-provided identity only | Repository owner during M00 |
| `O-009` | Target physical Android device(s) | At least one real device plus emulator, record model/OS/RAM | Project owner before M01/M10 |

## Deferred decisions

| ID | Item | Revisit trigger |
|---|---|---|
| `D-001` | Payments/escrow/payout architecture | A separately approved post-competition product phase with legal and financial review |
| `D-002` | Full messaging/chat and presence | Validated user need after the core work lifecycle is reliable |
| `D-003` | Ratings/reputation | Moderation and dispute policy approved |
| `D-004` | Identity verification | Legal/privacy basis, vendor/cost, and explicit user approval |
| `D-005` | Multi-worker gigs | Single-worker workflow validated and schema transition designed |
| `D-006` | General background synchronization | M13 proves a narrow need and Android scheduling/conflict behavior |
| `D-007` | Remote push notifications | Local notification baseline proves insufficient and zero-cost operations are confirmed |

## Change log procedure

1. Add or update an entry here when a decision changes state.
2. Update the linked ADR by changing `Proposed` to `Accepted` only after explicit approval. Do not rewrite an accepted decision; add a superseding ADR.
3. Update requirements, architecture, roadmap, and handoff if consequences change.
4. Link the approving issue/PR in the ADR and this register when repository references exist.
5. Never use this register alone as proof that an external dashboard setting, credential, migration, build, or test is complete.
