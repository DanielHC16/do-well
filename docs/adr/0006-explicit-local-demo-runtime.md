# ADR 0006: Explicit local demo runtime

- **Status:** Accepted
- **Date:** 2026-10-25
- **Decision owner:** Project owner

## Context

The production application is currently gated by Supabase session restoration and onboarding. The root provider always selects the production authentication path (`app/_layout.tsx:3-9`), the root route redirects from the resulting auth state (`app/index.tsx:6-23`), and public configuration requires a Supabase origin and publishable key (`src/shared/config/public-env.ts:6-16`, `src/shared/config/public-env.ts:80-88`). M03 is substantially implemented, but external OAuth and emulator connectivity remain acceptance blockers (`docs/SESSION_HANDOFF.md`, **M03 implementation checkpoint**).

The competition team needs a reliable emulator demonstration of the product workflow before external authentication is ready. The approved P0 product story is gig creation and discovery followed by application, one-worker selection, work submission, review, and completion (`docs/PRODUCT_REQUIREMENTS.md:17-23`, `docs/PRODUCT_REQUIREMENTS.md:45-62`). The schema and deterministic local fixtures already model those concepts (`supabase/migrations/20261022000100_schema_foundation.sql:97-378`, `supabase/seed.sql:83-233`), but there is no product UI beyond the protected placeholder (`app/(protected)/index.tsx:7-33`).

## Decision

Add a deliberately isolated **local demo runtime** selected only by `EXPO_PUBLIC_APP_RUNTIME=demo`. The unset/default value remains `production`.

In demo runtime:

- the root renders a demo provider and demo routes without constructing the production `AuthProvider` or Supabase client;
- two clearly fictional local personas, one employer and one worker, can be switched from the UI without credentials;
- a versioned AsyncStorage repository holds only synthetic demo data;
- a pure reducer/domain service enforces the demonstrated lifecycle: create/publish gig -> apply -> select one worker -> submit -> approve/complete;
- every screen displays a persistent `DEMO MODE - LOCAL DATA` indicator and the entry screen states that authentication, cloud sync, payments, and identity verification are not being demonstrated;
- a reset action restores deterministic seed data for repeatable judging;
- production routes, authentication, Supabase gateways, RLS, and migrations are not weakened or made conditional.

The first demo slice intentionally excludes OAuth, email/password, remote sync, multi-device concurrency, evidence uploads, AI claims, maps, payments, chat, notifications, and production authorization claims. Manual gig creation remains complete; no deterministic helper may be labeled AI.

## Alternatives considered

### 1. Finish hosted authentication and build directly on Supabase

This has the lowest long-term duplication and proves real authorization, but the external OAuth/connectivity blocker makes demo timing unreliable. It remains the production destination, not the expedited demo path.

### 2. Disable checks inside the existing production auth provider

This is superficially smaller but risks shipping an authorization bypass, mixing synthetic identities with real gateways, and masking missing RLS enforcement. Rejected.

### 3. Separate static click-through screens

This is fastest but does not demonstrate a working product: state changes, validation, persistence, and the end-to-end lifecycle would be fake. Rejected in favor of a small functional local runtime.

## Consequences

### Positive

- The demo works on an emulator with no internet, account, hosted service, or external cost.
- Production authentication and security boundaries remain fail-closed and independently testable.
- Pure domain actions and DTOs can later be retained while the local repository is replaced by Supabase-backed services.
- Deterministic reset makes the demo rehearsable and recoverable.

### Negative

- The demo repository duplicates a narrow subset of production persistence behavior.
- Single-device local transitions do not prove RLS, transactional concurrency, upload privacy, or real authentication.
- Demo data must be visibly labeled so judges are not misled.

## Security, data, and cost

- Demo runtime contains synthetic data only and must never read `.env.local`, OAuth downloads, or privileged credentials.
- No demo-mode flag may be accepted from a deep link, remote response, or runtime user input; it is fixed when Metro/build starts.
- Production remains the default. Release verification must fail if a competition/production artifact unintentionally contains demo runtime selection.
- Reset deletes only the exact versioned demo AsyncStorage key after confirming demo runtime.
- External-service cost is PHP 0 / USD 0.

## Validation gates

1. With no Supabase variables and `EXPO_PUBLIC_APP_RUNTIME=demo`, the Android emulator launches and completes the full lifecycle after a cold restart.
2. With the runtime variable unset, existing production auth tests and routing remain unchanged.
3. Invalid runtime values fail configuration validation rather than falling back to demo.
4. UI and tests prove that one worker cannot apply twice or be selected twice, invalid transitions are rejected, and reset restores the seed.
5. A release/configuration check proves production is the default and demo mode is visibly disclosed.

## Rollback

Remove the demo route group/provider and runtime selection, then delete the single versioned local demo key. No database migration or remote cleanup is required. Production auth and Supabase code remain unchanged throughout.
