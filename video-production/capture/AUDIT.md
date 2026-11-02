# Android recording evidence — 31 October 2026

## Recording target and environment

- Actual native Android app `com.anghulingpullrequest.dowell`, development APK already installed before this task. No rebuild or product changes.
- JavaScript source revision `2078bca` (local main, includes merged `feat/frontend-redesign-soft-productivity`). The synthetic preview uses its separate existing DemoShell, not the redesigned authenticated marketplace dashboard.
- Runtime: `EXPO_PUBLIC_APP_RUNTIME=demo`, served by local Metro port8082. Fictional presenter personas Maya Santos and Alex Reyes; local AsyncStorage data only. No account or cloud operation occurred.
- Android emulator `medium_phone`, API35, x86_64. Physical1080×2400/density420; capture override720×1600/density280. Overrides restored after capture.
- Existing user files `.gitignore` and `expo-env.d.ts` preserved. No app source, app dependencies, database, provisioning or privileged operations changed.
- Hosted operator artifact reported owner/admin `not_found` and worker `ready`; no valid two-principal hosted journey was available. No credentials were entered, recorded or exported.

## Verified sequential scenario

1. Maya created `Cafe event setup`, description `Prepare tables and arrange event supplies for a two hour community cafe event.`, category `Event support`, onsite, public area `Makati`, budgetPHP600. Publishing returned to home; the cafe listing subsequently appeared to Alex.
2. Alex opened the listing; app displayedPHP600, Event support, Makati, and `This gig is publicly listed in Makati.` under `Why this may fit`.
3. Alex applied with `I can help prepare tables and organize supplies for the two hour event.` The app displayed `Application sent` and `Your local application is pending.`
4. Maya reviewed Alex's message and tapped Select worker. UI changed listing to ASSIGNED, application to ACCEPTED and agreement to ACTIVE.
5. Alex submitted `Tables are ready and event supplies are arranged for the community cafe event.` UI changed agreement to SUBMITTED and displayed waiting for employer approval.
6. Maya tapped Approve completed work. UI changed to COMPLETED and `Demo lifecycle complete`.
7. Activity timeline showed publication, application, selection, submission, approval; this is local synthetic activity, not remote notification evidence.
8. Separate remote demonstration opened seeded `Prepare event spreadsheet`, PHP1200, with `Remote work can be completed from the worker's current area.` No GPS prompt appeared.

## Feature status from this Android session

| Feature | Observed status / evidence limit |
|---|---|
| Auth / onboarding | Production sign-in screen briefly viewed before fallback; successful authentication and onboarding not verified. |
| Employer / worker | Fictional local presenter switch verified, not two authenticated principals. |
| Create / publish | Fully completed in synthetic runtime. |
| Job Brief Builder | Not present in synthetic UI; omitted from demonstrated capabilities. |
| Nearby discovery | Public-area listings and area explanation observed; no measured distances or GPS ranking demonstrated. |
| Remote discovery | Existing remote opportunity and its explanation observed. |
| Details / apply | Completed locally, pending state observed. |
| Applicant selection | Completed locally, accepted and active states observed. |
| Agreement | Active/submitted/completed synthetic assignment states observed. No hosted transaction proof. |
| Milestone checklist | Not present in synthetic UI; omitted. |
| Work submission | Text submission verified. |
| Photo evidence | Not present in synthetic UI; omitted. |
| Review / approve | Completed locally. |
| Activity | Five local events observed. No remote push or native notification delivery tested. |
| Offline cache | Persistent local synthetic state survived emulator restart. This does not prove production cache or offline synchronization. |
| Administrator | Not exercised, omitted. |
| Security/privacy | UI asks public area and discloses local demo. No production RLS, Storage policy, authentication or privileged operation acceptance proven by these clips. |
| Payment | No payment, escrow or transfer exists in demonstrated flow. |

## Source recordings and edit decisions

Raw originals are preserved under `public/footage/`; normalized editor files are under `public/footage/edit/`. Exact file durations and changes are in `edit-manifest.json`. Native screenrecord uses variable frames, ending on the last changed frame; editor files hold that verified true frame to their assigned lengths, without looping or inventing any UI state. Creation typing is accelerated1.5×. Discovery's remote detour is removed because the remote screen has its own segment. All other actions retain their native progression.

Approximate source action times (see contact sheets and last-frame PNGs for direct evidence):

-02: title entered around3–10s; description around13–23s; category around25–28s; area around30–33s; budget around35–38s; publish around45–46.8s. The destination home alone does not display the new third listing until scrolled; next discovery clip verifies it.
-03: worker switch around2–3s; listings around3–13s; remote around13–16s; cafe details around19–20.65s. Normalized edit removes13–16s.
-04: application typing around2–6s; application sent/pending at the tail before12.06s.
-05: employer applicant review around4–9s; selection around9–11s; accepted/assigned visible12–18s; active assignment at end21.8s.
-06: opens active assignment, enters work note, submits; submitted/waiting approval visible at final16.37s.
-07: employer review followed by approve; completed state visible at final4.69s.
-08: scrolls completed assignment to full five-entry activity timeline, final2.86s.
-09: actual remote details screen; no application submitted.

## Infrastructure recovery

Initial host CPU95%, available RAM1GB and heavy disk queue caused system-wide Android ANRs, affecting Google services as well as the app. Unused Metro, browser preview and speech jobs were paused/stopped; a non-destructive cold emulator restart with SwiftShader plus reduced display resolution restored responsiveness. Original app data was retained. Finalized source06/07 were re-pulled after an automated probe detected premature copies missing MP4 metadata; finalized copies decode successfully.

Emulator was shut down after recording to release resources. Demo Metro8082 may remain running; `capture/start-demo.ps1` reproduces its non-secret runtime flags.
