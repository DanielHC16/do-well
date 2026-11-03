# Disaster Recovery & Operations Runbook

**Document:** `docs/DISASTER_RECOVERY.md`  
**Milestone:** M14 — Verify security and produce competition build  
**Scope:** Operator recovery procedures, database state restore, and presentation contingencies

---

## 1. Presentation Contingency Matrix

| Scenario                                      | Symptom                                                                 | Immediate Operator Action                                                                                                                                                   | Fail-Safe Fallback                                                                                                                                                             |
| :-------------------------------------------- | :---------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Judging Venue Wi-Fi Failure**               | Network requests timeout or fail to resolve.                            | Show previously loaded, labelled cached snapshots if available. Preserve drafts; live writes require reconnect and explicit submission.                                     | Move to a prepared device/emulator with the standalone offline demo APK; follow [DEMO_GUIDE.md](DEMO_GUIDE.md). Runtime is compiled into the APK, not a welcome-screen switch. |
| **Hosted Supabase Outage / Rate Limit**       | Gateway errors (`503 Service Unavailable` or `Network request failed`). | Stop live mutations and explain the outage. A local Docker stack is useful only if separately configured and rehearsed; starting Docker does not retarget an installed APK. | Use the prepared offline demo APK and identify its local, simulated workflow during the presentation.                                                                          |
| **Corrupted Local Draft or Cache State**      | App opens with unexpected form values or stale UI.                      | Sign out from Profile screen (triggers automatic cache purge via `AuthProvider`).                                                                                           | Clear app data in Android Settings -> Apps -> Do Well -> Clear Storage.                                                                                                        |
| **Physical Device Battery / Display Failure** | Device crashes or disconnects during judging.                           | Open the prepared emulator. This machine's verified AVD name is `do_well_demo_api35`; list available AVDs with `emulator -list-avds`.                                       | Install the already-built APK and launch it using [DEMO_GUIDE.md](DEMO_GUIDE.md). Avoid a native compilation during the presentation.                                          |

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
   - Run `npm run test:run -- tests/security/secret-exposure.test.js`.

---

## 4. Disaster Recovery Validation Proof

Historical M14 checks are not fresh release evidence. Current APK checks and their limits are recorded in [DEMO_GUIDE.md](DEMO_GUIDE.md). Re-run the following against the target build before claiming recovery acceptance:

- Launch the offline demo APK with no network and complete/reset its synthetic journey.
- Sign out of a live account and verify private caches cannot be read by a different account.
- Rehearse database reset only against the disposable local database; record actual duration and output. Never reset hosted demo or production data as a presentation fallback.
