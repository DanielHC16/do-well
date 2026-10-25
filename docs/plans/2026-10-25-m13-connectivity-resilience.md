# Implementation Plan: M13 Weak-Connectivity Resilience

**Milestone:** M13 — Harden weak-connectivity behavior  
**Branch:** `feat/connectivity-resilience`  
**Tracking Issue:** [#14 — [M13] Harden weak-connectivity behavior](https://github.com/DanielHC16/do-well/issues/14)  
**Governing Specification:** `docs/OFFLINE_STRATEGY.md`  
**Budget:** Strictly PHP 0 / USD 0  

---

## 1. Overview & Architecture Goals

Milestone M13 implements Level 1 (offline reading of bounded cached data) and Level 2 (offline form drafts and explicit pending/reconciled mutations) without false claims of background sync.

### Key Deliverables:
1. **Connectivity Detection & Context**:
   - Install `expo-network` (`~58.0.4`).
   - `ConnectivityService` with `getNetworkStateAsync()` and event listeners.
   - `ConnectivityProvider` supplying reactive network status (`isConnected`, `isInternetReachable`, `connectionType`).
   - Accessible `OfflineBanner` mounted in `AuthenticatedLayout` / Shell with high contrast and explicit copy.
2. **User-Scoped Bounded Snapshot Cache**:
   - `src/shared/persistence/cache-store.ts` managing `@dowell/cache/{userId}/{key}` in AsyncStorage.
   - Max 50 items per user namespace, max 500 KB per entry, LRU eviction.
   - Integrated with `discoveryGateway` (cached feed fallback) and `assignmentGateway` (cached assignment fallback).
   - `StaleDataBadge` component displaying `"Saved snapshot from [Time]"` when rendered from cache.
   - User switch & logout purge: drops cached entries on sign-out to prevent data leakage.
3. **Draft Preservation Across App Restarts**:
   - `src/features/applications/data/application-draft-store.ts` for worker application bids.
   - `src/features/submissions/data/submission-draft-store.ts` for worker submission notes and photo references.
   - Restores draft on screen mount; clears on successful submission.
4. **Mutation Idempotency & Reconciliation**:
   - Wraps core mutations with bounded timeouts (12s abort signal).
   - If a request drops or times out, the client reconciles against the server using `client_request_id` before creating a duplicate request.

---

## 2. File Implementation Map

| File Path | Purpose |
| --- | --- |
| `src/features/connectivity/model/connectivity-types.ts` | Types for network state, reachability, connection type. |
| `src/features/connectivity/services/connectivity-service.ts` | `expo-network` abstraction with testable adapter. |
| `src/features/connectivity/context/ConnectivityProvider.tsx` | React Context and `useConnectivity()` hook. |
| `src/features/connectivity/components/OfflineBanner.tsx` | Global amber banner shown when offline/unreachable. |
| `src/features/connectivity/components/StaleDataBadge.tsx` | Visual indicator for cached read data. |
| `src/shared/persistence/cache-store.ts` | Bounded, user-scoped AsyncStorage read cache. |
| `src/features/applications/data/application-draft-store.ts` | Persistent draft store for worker applications. |
| `src/features/submissions/data/submission-draft-store.ts` | Persistent draft store for worker submission evidence. |
| `src/shared/api/network-timeout.ts` | Timeout & reconciliation helpers. |
| `src/features/shell/components/AuthenticatedLayout.tsx` | Wire `OfflineBanner` into shell. |
| `src/features/discovery/data/discovery-gateway.ts` | Add cached read fallback with `cachedAt` metadata. |
| `src/features/assignments/data/assignment-gateway.ts` | Add cached assignment detail fallback. |
| `src/features/auth/data/auth-gateway.ts` | Wire `cacheStore.purgeUser` on `signOut`. |

---

## 3. Step-by-Step Execution Plan

### Task 1: Connectivity Foundation
- Create types, service, context provider, and unit tests.
- Verify on emulator with simulated airplane mode.

### Task 2: User-Scoped Bounded Cache Store
- Create `cache-store.ts` with size bounding, LRU eviction, and `purgeUser`.
- Write unit tests for bounded capacity, expiry, and user isolation.

### Task 3: Discovery & Assignment Cached Reads
- Integrate cache fallback into `discovery-gateway.ts` and `assignment-gateway.ts`.
- Add `StaleDataBadge` when viewing cached records offline.

### Task 4: Form Drafts (Applications & Submissions)
- Create `application-draft-store.ts` and `submission-draft-store.ts`.
- Wire into `ApplyModal` / application screens and `WorkerAssignmentDetailScreen`.

### Task 5: Mutation Reconciliation & Timeout Safety
- Create `network-timeout.ts` and verify retry behavior does not duplicate records.
- Wire user-switch purge on sign-out.

### Task 6: Verification & Test Matrix
- Run full test suite (`npm run test:run`), `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npx expo-doctor`.
- Stage commits using Conventional Commits.
