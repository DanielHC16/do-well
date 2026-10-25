# Disaster Recovery & Operations Runbook

**Document:** `docs/DISASTER_RECOVERY.md`  
**Milestone:** M14 — Verify security and produce competition build  
**Scope:** Operator recovery procedures, database state restore, and presentation contingencies  

---

## 1. Presentation Contingency Matrix

| Scenario | Symptom | Immediate Operator Action | Fail-Safe Fallback |
| :--- | :--- | :--- | :--- |
| **Judging Venue Wi-Fi Failure** | Network requests timeout or fail to resolve. | Toggle device Airplane Mode ON to trigger graceful offline banner. Show cached snapshots. | Tap `"Demo Preview"` on welcome screen. Complete presentation using local offline demo runtime. |
| **Hosted Supabase Outage / Rate Limit** | Gateway errors (`503 Service Unavailable` or `Network request failed`). | Switch to local Docker Supabase stack via `npm run db:start` on presentation laptop. | Pivot immediately to Demo Preview mode (`/(demo)`). |
| **Corrupted Local Draft or Cache State** | App opens with unexpected form values or stale UI. | Sign out from Profile screen (triggers automatic cache purge via `AuthProvider`). | Clear app data in Android Settings -> Apps -> Do Well -> Clear Storage. |
| **Physical Device Battery / Display Failure** | Device crashes or disconnects during judging. | Launch Android emulator: `emulator -avd Pixel_9_Pro_API_35`. | Run `npx expo run:android` targeting emulator. |

---

## 2. Local Database Backup & Restore Rehearsal

### Backup Local Database State
```powershell
# Export schema and data from local Docker Supabase stack
npm run db:start
supabase db dump --local --data-only > supabase/backups/demo_seed_backup.sql
```

### Deterministic Reset & Seed Restore
```powershell
# 1. Reset database to initial migrations and clean seed
npm run db:reset

# 2. Re-verify database integrity with test suite
npm run db:test
```

---

## 3. Remote Credential Rotation Procedure

If any API key or credential is suspected of exposure:
1. **Supabase Publishable Key**:
   - Access Supabase Dashboard -> Project Settings -> API.
   - Roll publishable/anon key.
   - Update `.env.local` with new `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. **Google OAuth Client**:
   - Access Google Cloud Console -> Credentials.
   - Delete affected client ID/secret and generate new Android OAuth client ID matching SHA-1 fingerprint of signing keystore.
3. **Audit Verification**:
   - Run `npm run test:run -- tests/security/secret-exposure.test.ts`.

---

## 4. Disaster Recovery Validation Proof

- [x] Tested zero-network launch: App launches directly into Demo Preview or cached shell without crashes.
- [x] Tested cache purge: Sign-out purges `@dowell/cache/{userId}/*` and restores clean unauthenticated state.
- [x] Tested deterministic seed reset: `npm run db:reset` restores all tables, constraints, RPCs, and seed records in under 15 seconds.
