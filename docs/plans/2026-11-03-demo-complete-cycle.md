# Offline APK: complete job cycle

Status: owner-approved scope, implementation in progress (3 November 2026).

The owner requested a complete offline job cycle without manually operating both accounts, account switching in Settings, and removal of presentation disclaimers from product screens. This supersedes ADR 0006's on-screen disclosure/manual-persona presentation requirements for this offline runtime only. The APK filename, README, runbook and PR continue to identify the simulated, locally persisted environment and its boundaries.

## Architecture

Retain the isolated compile-time demo runtime and validated local reducer/repository. Compose a user action and the other account's appropriate response before one atomic save. Do not call hosted services, change live authorization, introduce timers or add dependencies. Preserve the public context API. Reconcile saved pending applications and unfinished counterpart turns on load/account switch so existing installations can proceed without deleting data. Use the existing brand tokens and routes, with a dedicated Settings screen and explicit assignment navigation.

## Acceptance

1. Employer publishes a gig; Alex's application appears automatically. Employer selects Alex; a submitted work note becomes available. Employer approves; assignment and gig complete with the full event timeline.
2. Worker applies to an available gig; Maya selects the worker automatically. The accepted application links to the assignment. Worker submits a note; employer approval completes the assignment and gig.
3. Existing saved applications stuck at pending recover after an APK update. Reopening the app retains progress without duplicate applications, assignments or activity.
4. Settings contains account switching and a confirmed local reset. The dashboard has neither account-switch controls nor presentation disclaimers. Product copy uses ordinary marketplace language.
5. Validation errors, duplicate taps and failed local saves do not corrupt or partially advance state. No live accounts, credentials, billing, video or hosted schema change.
6. Test-first regressions, full app checks, independent review, and both role cycles in the actual standalone APK pass. Replace `do-well-apk/do-well-demo-offline.apk`, record its checksum and revise the runbook; leave the live APK unchanged.

## Delivery

Use branch `fix/demo-complete-cycle` and one cohesive PR under the owner's continuing commit/PR/merge authorization. Build locally at PHP 0 / USD 0. Keep signing material and generated native output ignored. Physical-device and hosted acceptance remain tracked in #46.
