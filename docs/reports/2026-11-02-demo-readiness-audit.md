# Demo readiness audit — 2 November 2026

Follow-up checked 3 November: [PR #48](https://github.com/DanielHC16/do-well/pull/48) restores the account routes/integrations and corrects both automated review findings using scoped TanStack Query and moderation queue refetch. Fresh full checks: **115 suites / 718 tests**, formatting/lint/typecheck, Doctor **20/20**, independent review LGTM. See the [demo guide](../DEMO_GUIDE.md) for final APK/install/rehearsal evidence and the [session handoff](../SESSION_HANDOFF.md) for current boundaries. Video generation is outside the current task; findings below record the earlier audit.

## Assessment

The app is demo-capable, with release and acceptance gaps. Core production features cover posting, discovery, applications, agreements, milestones, submissions, activity, profiles and reporting. The redesign is merged in PR #44. PR #45 fixes assignment-detail parsing from the real snake_case RPC payload and contains the independent competition-video workspace. Fresh verification and APK evidence belong in the session handoff and demo guide; historical test totals do not establish current success.

The repair working tree freshly passed formatting, ESLint, strict TypeScript and **114 suites / 713 tests**. Expo Doctor passed **20/20** after compatible SDK patch alignment. Android Hermes export passed (1,735 modules;5.2MB bundle). Independent review cleared the final Settings/Admin integrations after correcting server default hydration, local activation error reporting and moderation note minimum length. APK compilation/installation is a separate acceptance gate recorded in the demo guide.

## Findings and disposition

| Finding | Evidence | Disposition |
| --- | --- | --- |
| Mobile CI includes independent Remotion sources without their dependencies | Root tsconfig includes all TS/TSX; root npm ci only installs mobile dependencies | Exclude video-production from mobile typecheck; retain independent composition validation |
| Video preparation fails on a fresh checkout | prepare.mjs writes ignored output directory without creating it | Reproduced ENOENT, regression test, recursive mkdir |
| Short unmeasured video drafts fail timeline bounds | Target minimum450s padding applied only to measured narration | Reproduced426s fixture; sum chapter frames and pad last chapter consistently |
| Settings and Admin components are unreachable | Profile/settings push protected routes absent from app tree; unmatched route renders unavailable state | Restore routes and validated existing RPC integrations in a separate follow-up |
| Default brief generation is a template | ai-brief-gateway singleton has no primary provider | Present structured/template assistance, not proven model inference |
| Offline fallback is a separate runtime | RootRuntime and app/index select build-time EXPO_PUBLIC_APP_RUNTIME | Build separate live and demo APKs; no sign-in Demo Preview switch exists |
| Old demo runbooks overclaim | Ratings, automatic sync and nonexistent controls in historical instructions | Replace with actual controls, explicit offline boundaries and two-identity live workflow |
| Issue and roadmap drift | Old M15–M20 issue URLs point to PR numbers; #4 includes deferred acceptance | Correct links; close completed M03A scope only, transfer remaining checklist to #46 |

## Evidence boundaries

The later1 November real-app recut in video-production/CHECKPOINT.md records two hosted test identities, five listings and actual frontend recordings. This supersedes older statements that no hosted rehearsal was available. It is partial evidence: the same record reports unresolved emulator GPS, cancelled camera crop, Settings404 and Activity taps without navigation. Do not claim those passed from footage alone.

The synthetic offline runtime implements post → apply → select → text submission → approve using fictional local data and a visible disclosure. It has a simpler interface than the production redesign and does not verify OAuth, hosted RLS, cross-device synchronization, photo Storage, GPS or native notifications. The reducer journey in tests/e2e/competition-workflow.test.ts is a domain test, not Android UI E2E.

Database CI validates local migrations/policies. The separate HTTP multi-principal suite is excluded by the normal Jest config and is not run by that database job. Both authentication methods, callbacks after background/killed-app launch, session refresh/revocation/offline restoration, logout/cache isolation, physical-device matrix and password-recovery scope remain tracked in [#46](https://github.com/DanielHC16/do-well/issues/46).

## Scope and safety

Fixes reuse approved Expo/Supabase architecture and existing M17/M18 contracts. No schema, hosted provisioning, capability grant, billing or paid build service is needed. Preserve pre-existing .gitignore/expo-env.d.ts changes. Keep keys, account-password artifacts, generated native files and APKs out of Git. Demo builds use development signing and are for sideloading, not a Play Store release.
