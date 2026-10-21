# ADR 0001: Expo and Supabase modular architecture

- Status: Proposed
- Date: 2026-10-21
- Owners: DO-WELL engineering team

## Context

DO-WELL is an Android-first student competition app with a hard PHP 0 / USD 0 external-service budget, a small team, weak-connectivity requirements, and a short delivery horizon. The approved technologies are React Native, TypeScript, Expo development builds, Expo Router, and Supabase. Complexity must remain proportional to one MVP application.

## Decision

Use a modular monolith in one Expo repository. Expo Router owns navigation; feature folders own UI, schemas, hooks, and data adapters. TanStack Query owns remote server state. React context is limited to authentication, selected operating mode, and cross-cutting connectivity; local component state remains local. Zod validates forms, deep-link parameters, Edge Function inputs, and model output. Supabase provides Auth, PostgreSQL, private Storage, Realtime only where justified, and small Edge Functions for privileged or external operations. PostGIS is an optional measured optimization governed by ADR 0003, not an M02 dependency.

The mobile client receives only the Supabase project URL and publishable key. Privileged keys and provider credentials stay in Supabase-managed secrets or local server-only environments. Database changes are versioned migrations; protected tables use RLS and server-enforced state transitions.

Use Expo Continuous Native Generation: generated `android/` and `ios/` directories remain untracked unless an accepted later ADR requires persistent native projects. Pin Node, package manager, Expo SDK, and dependencies in M01. Target Expo SDK 58 after upgrading Node to at least 22.13 and installing Android API 37; if the M01 compatibility spike finds a blocking library regression, record a temporary SDK 57 exception rather than improvising.

## Alternatives considered

- Separate microservices: rejected because it increases deployment, security, and operational cost with no MVP benefit.
- Firebase as the primary backend: rejected because Supabase is approved and relational workflows/RLS fit the domain.
- Redux or a global Zustand store for all state: rejected because TanStack Query plus narrow context is sufficient.
- Bare React Native: rejected because Expo development builds support the required native integrations with less maintenance.

## Consequences

- Domain boundaries remain clear without multiple deployables.
- Native packages require development builds; Expo Go is not the acceptance environment.
- Supabase Free quotas and pausing are operational constraints, so migrations, seed data, exports, and a recovery drill are required.
- SDK 58 is current but newly released; M01 must prove Android build and critical native-library compatibility before feature work.

## Validation gates

- M01: Android debug/development APK installs and launches on a physical device.
- M02: migrations recreate the schema from an empty local database and RLS tests pass.
- Every milestone: lint, format check, typecheck, tests, build appropriate to the change, staged secret scan, and reviewer findings resolved.
