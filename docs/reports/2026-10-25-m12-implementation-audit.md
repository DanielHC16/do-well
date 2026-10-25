# M12 implementation audit and corrective disposition

**Date:** 2026-10-25 (Asia/Manila)  
**Reviewed merge:** PR #34 / `04cf199`  
**Corrective branch:** `fix/m12-evidence-hardening`

## Why this audit exists

An independent review of the AI-authored M12 implementation found that passing tests did not prove several acceptance and security claims. This report records the defects, their root causes, and the corrective evidence instead of treating the original documentation as proof.

## Blocking findings and disposition

| Finding | Root cause | Corrective disposition |
| --- | --- | --- |
| A worker could finalize fictional evidence paths | `finalize_submission` trusted the client manifest without looking up `storage.objects` | Corrective migration requires an existing object in the private bucket and exact stored MIME/size agreement before inserting `submission_files` or advancing assignment state. |
| Concurrent submissions could allocate the same version | `max(version) + 1` ran without serializing per assignment | `begin_submission` now locks the assignment row before version allocation. |
| React Native fallbacks could reuse the all-zero request ID or create a non-UUID filename | Client code relied on optional `globalThis.crypto.randomUUID` | All submission and evidence IDs use the installed `expo-crypto` implementation. |
| Upload retries were not actually retryable | Every press created a new reservation; uploads requested `upsert` although Storage denied updates | One in-memory attempt retains its request ID, file IDs, and successful manifest entries; retries skip completed files and immutable uploads use `upsert: false`. Restart-safe recovery remains part of M13. |
| Unsupported or unmeasured images could be relabelled as JPEG/1 KB | Picker metadata defaults hid unknown MIME and size | Unsupported formats and missing sizes now fail explicitly; blob size is measured again before upload and becomes the finalized manifest size. |
| Notification channels and deep links were documented but not connected | The scheduler discarded `channelId`; no response observer existed; mutations notified the actor's own device | Delivery is channel-aware, responses are allowlisted and handled for cold/foreground starts, and local alerts are generated from unread recipient activity with per-account persisted deduplication and explicit permission. |
| Employer review could proceed with unverifiable evidence | Signed-URL failures were swallowed and review buttons stayed active | Loading and error states are visible, retryable, and block approval/revision until the evidence manifest resolves. |
| Completion copy implied payment processing | UI copy equated work approval with payment finalization | Completion copy now says the agreed amount and explicitly states that payment is handled outside DO-WELL. |

## Deliberate boundary

- Local alerts are based on canonical activity already fetched by the app; remote push/FCM is not claimed.
- Upload recovery currently survives retries while the assignment screen remains mounted. Durable restart/reconnect reconciliation and abandoned-upload cleanup belong to M13 because the retention period is still an open product decision.
- Signed URLs remain short-lived and are never persisted.

## Verification record

Exact final command output is recorded in the corrective pull request. Required gates are formatting, lint, strict typecheck, the complete Jest suite, local reset and pgTAP suite, database lint/type drift, Expo Doctor, secret scan, and hosted migration dry-run/apply evidence.
