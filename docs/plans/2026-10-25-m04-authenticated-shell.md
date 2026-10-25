# M04 — Authenticated Shell and Dual-Mode Navigation Plan

## Overview

Deliver a stable, accessible shell that switches worker and employer presentation modes without altering underlying identity, authentication tokens, or database authorization.

- **Milestone:** M04
- **Issue:** [#5 — M04 Add authenticated shell and dual-mode navigation](https://github.com/DanielHC16/do-well/issues/5)
- **Branch:** `feat/app-shell`
- **Dependencies:** M03A (Auth foundation), D01 (Noticeboard design system tokens and visual language)

---

## Architectural Principles

1. **One Account, Dual Views**:
   - A single authenticated user profile switches between `worker` and `employer` presentation modes.
   - Mode switching affects only client-side presentation and routing. It never alters PostgreSQL RLS policies, role claims, or row ownership.
2. **Persistent Presentation State**:
   - Presentation mode is persisted per user via AsyncStorage (`do-well.shell-mode.v1:<userId>`).
   - If storage is corrupted or unreadable, the system defaults fail-closed to `worker` mode and allows safe retry without unseating the session.
3. **Thin Route Architecture**:
   - Files under `app/(protected)/` remain strictly minimal adapters delegating directly to feature screens in `src/features/shell/`.
4. **Noticeboard Aesthetic & Accessibility**:
   - Reuses `setupTheme` high-contrast tokens, tactile borders, clear typography, and accessible accessibility roles (`tab`, `radio`, `header`, `alert`).

---

## Route Inventory

| Route | File | Component | Description |
|---|---|---|---|
| `/(protected)` | `app/(protected)/index.tsx` | `ProtectedIndexRoute` | Evaluates active mode and redirects to `/(protected)/worker` or `/(protected)/employer` |
| `/(protected)/worker` | `app/(protected)/worker.tsx` | `WorkerHomeScreen` | Worker noticeboard with status and coming-next hooks |
| `/(protected)/employer` | `app/(protected)/employer.tsx` | `EmployerHomeScreen` | Employer noticeboard with status and coming-next hooks |
| `/(protected)/activity` | `app/(protected)/activity.tsx` | `ActivityRoute` | Shared audit trail placeholder for upcoming workflow milestones |
| `/(protected)/profile` | `app/(protected)/profile.tsx` | `ProfileRoute` | Displays profile identity and provides sign-out action |
| `/(protected)/[...unmatched]` | `app/(protected)/[...unmatched].tsx` | `ProtectedUnmatchedRoute` | 404 handler within protected boundary |

---

## Verification Strategy

1. **Unit & Component Testing**:
   - `shell-mode-store.test.ts`: Read, write, sanitization, invalid identifier handling.
   - `ShellModeProvider.test.tsx`: Loading, context provision, state mutation, retry boundary.
   - `AuthenticatedHomeScreen.test.tsx`: Worker/employer mode copy and mode-switching action.
   - `AuthenticatedProfileScreen.test.tsx`: Profile display and sign-out dispatch.
   - `AuthenticatedActivityScreen.test.tsx`: Activity view rendering.
   - `route-guards.test.tsx`: Guard enforcement for sign-in, onboarding, ready state, and demo bypass.
   - `routes.test.tsx`: Route component mounting and delegation.
2. **Type Safety & Diagnostics**:
   - Strict TypeScript (`tsc --noEmit`) verifying Expo Router typed navigation paths.
   - ESLint and Prettier conformance checks.
   - `npx expo-doctor` 20/20 clean health confirmation.
