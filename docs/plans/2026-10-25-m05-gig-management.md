# M05 — Gig Creation and Employer Management Plan

## Overview

Deliver complete employer gig management allowing authenticated employers to draft, validate, publish, edit, close, and review one-worker gigs against the PostgreSQL/Supabase schema while protecting location privacy and enforcing server-side state transitions.

- **Milestone:** M05
- **Issue:** [#6 — [M05] Build gig creation and employer management](https://github.com/DanielHC16/do-well/issues/6)
- **Branch:** `feat/gig-management`
- **Dependencies:** M04 (Authenticated shell and dual-mode navigation), M02 (Schema and RLS foundation)

---

## Architectural Boundaries

1. **Transactional Server-Side Transitions**:
   - Gigs in `status = 'draft'` can be created, updated, and deleted directly by their owning employer under `gigs_insert_own_draft` and `gigs_update_own_draft` RLS policies.
   - Moving a gig out of `'draft'` to `'published'` or closing a gig to `'closed'` must occur via PostgreSQL transactional RPCs (`publish_gig` and `close_gig`) to guarantee data integrity, validate constraints, and record append-only audit events into `activity_events`.
2. **Category Allowlist**:
   - Uses the approved eight-category check constraint: `'errands'`, `'delivery'`, `'cleaning'`, `'events'`, `'admin'`, `'tutoring'`, `'digital'`, `'other'`.
3. **Location Privacy**:
   - Public projections expose only coarse `public_area` (and coarse coordinates if present). Exact addresses or instructions are kept in `gig_private_locations` and are never exposed during discovery or creation.
4. **Draft Resilience**:
   - Half-composed gig forms are persisted per employer in AsyncStorage (`do-well.gig-draft.v1:<userId>`) so partial entries survive phone sleep, navigation switches, or accidental restarts.
5. **AI Entry Point Gating**:
   - AI brief creation is explicitly disabled with an accessible "Coming in M10" indicator.

---

## Task Breakdown

### Task 1: Migration & RPCs (`supabase/migrations/`)
- Add migration `20261025000100_gig_lifecycle_rpcs.sql`:
  - `public.publish_gig(p_gig_id uuid)`
  - `public.close_gig(p_gig_id uuid)`
- Add pgTAP test suite `supabase/tests/070_gig_management_rpcs.test.sql`:
  - Verify employer can publish their own valid draft.
  - Verify non-owner cannot publish.
  - Verify publishing non-draft fails.
  - Verify employer can close their own gig.
  - Verify activity events are emitted.
- Update generated types via `npm run db:types`.

### Task 2: Domain Schemas & Local Draft Store (`src/features/gigs/`)
- `src/features/gigs/model/gig-schemas.ts`: Zod validation for gig creation, updating, and categories.
- `src/features/gigs/data/gig-draft-store.ts`: AsyncStorage persistence for unsaved drafts.
- Unit tests: `src/features/gigs/data/__tests__/gig-draft-store.test.ts` and `src/features/gigs/model/__tests__/gig-schemas.test.ts`.

### Task 3: Gig Gateway & Services (`src/features/gigs/data/`)
- `src/features/gigs/data/gig-gateway.ts`:
  - `createDraft(input)`
  - `updateDraft(input)`
  - `publishGig(gigId)`
  - `closeGig(gigId)`
  - `listEmployerGigs(employerId)`
  - `getGigById(gigId)`
- Unit tests: `src/features/gigs/data/__tests__/gig-gateway.test.ts`.

### Task 4: UI Screens & Components (`src/features/gigs/components/` & `screens/`)
- `GigFormScreen.tsx`: Complete create/edit form with draft saving, validation errors, and publish button.
- `EmployerGigDetailScreen.tsx`: Employer detail view with status badges, metadata, and close action.
- Update `AuthenticatedHomeScreen.tsx` employer mode to list actual posted gigs and link to the creation flow.
- Component tests: `src/features/gigs/screens/__tests__/GigFormScreen.test.tsx` and `EmployerGigDetailScreen.test.tsx`.

### Task 5: Protected Routes (`app/(protected)/employer/`)
- `app/(protected)/employer/gigs/new.tsx`: Create gig route.
- `app/(protected)/employer/gigs/[gigId].tsx`: Manage gig route.
- Route tests in `app/(protected)/__tests__/routes.test.tsx`.

### Task 6: Full Verification
- `npm run db:reset`
- `npm run db:test`
- `npm run db:lint`
- `npm run db:types:check`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npx expo-doctor`
