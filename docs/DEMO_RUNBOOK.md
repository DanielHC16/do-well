# Competition demo script

Use [DEMO_GUIDE.md](DEMO_GUIDE.md) for APK installation, emulator commands, build details, and current verification. Rehearse the exact APK you will present.

## Choose the demonstration

The **live APK** runs the current marketplace interface against the configured Supabase project. It requires internet and separate employer and worker accounts. The **offline demo APK** starts directly with fictional Maya and Alex accounts and local persistence. Its counterpart responses are simulated automatically. Product screens use ordinary marketplace copy at the owner's request; this guide and the APK filename identify the offline environment. Runtime selection is compiled into the APK; there is no sign-in-screen runtime switch.

Do not call the offline sandbox proof of hosted authentication, RLS, image upload, AI inference, payments, or remote notifications. No payment processing is implemented. Switching Find/Offer mode in the live app changes the current account's workspace; it does not sign in as another person.

## Reliable offline script: 3–4 minutes

Tap **DO / WELL** in the top-left header (the **Home** accessibility action) to return to the dashboard, and **Settings** to change accounts. Neither cycle requires changing accounts in the middle.

1. **Introduce (15 seconds).** “Do Well organizes neighborhood work from a clear gig to an approved result.” Explain the local sample environment when describing the technical scope.
2. **Employer: post (40 seconds).** Start as **Maya · Employer**. Create a gig with title “Prepare community event checklist”, a description longer than 20 characters, category `admin`, Remote, and PHP 500. Publish it, then manage that listing.
3. **Employer: select and review (35 seconds).** Alex's application appears automatically. Select Alex and open the assignment. Alex's work note is automatically ready for review. Approve completed work and show the completion state and activity timeline.
4. **Change accounts (15 seconds).** Open **Settings → Switch account**, choose **Alex · Worker**, and return Home.
5. **Worker: apply and get the job (35 seconds).** Open an available seeded gig, such as “Prepare event spreadsheet”. Enter an application message and send it. Maya automatically accepts it. Tap **Open assignment** to continue directly from the accepted application.
6. **Worker: submit and finish (30 seconds).** Enter a work note of at least 10 characters and tap **Submit work**. Maya's automatic approval completes the job. Show the completed state and all lifecycle events.
7. **Persistence (15 seconds).** Close and reopen the app; the same account and completed jobs remain. A pre-update pending application also recovers automatically without resetting.

Before the next presentation, use the reset action in **Settings** and confirm it. Reset affects only local sample progress and returns to the initial employer account with two available gigs. It does not clear live sessions or hosted data.

These automatic applications, selections, text submissions and approvals occur only inside the offline runtime. There are no real counterpart decisions, payments, hosted writes or photo uploads. Use the separately rehearsed live app when presenting those supported integrations.

## Live script: rehearse with two accounts first

1. Sign in as the employer, complete the profile if requested, and select **Offer**. Use the center action to post a small remote gig with a unique rehearsal title. Review all brief-builder output before publishing.
2. On a second device/session, sign in as a different worker and select **Find**. Pull to refresh, open that gig, and apply.
3. As employer, open **My Work**, inspect the applicants, confirm worker selection, and open the resulting workspace. Complete any displayed agreement confirmations and configure one small milestone.
4. As worker, open **My Work**, review the workspace, complete the applicable agreement step, and submit the milestone with a note and optional permitted image evidence.
5. As employer, refresh, review the submission, approve it, and show the resulting work/activity state. If revision is demonstrated, request revision before the worker resubmits and the employer approves.
6. Show **Activity** and the profile/settings screens. Describe device alerts as local notifications for events the device has read, not server push to a closed app.

The precise live sequence must be rehearsed against the actual hosted state. Account setup, OAuth browser consent, permission prompts, and migration/provisioning should be completed before presentation time. Do not improvise admin provisioning or database resets during judging.

## Presentation preparation

- Keep the laptop plugged in, close heavy apps, charge the phone, disable unrelated notifications, and increase screen timeout.
- Have a tested data cable and the APKs available locally. A standalone release APK starts without Metro; live backend operations still require internet.
- Rehearse both success and denied-permission paths. Use Remote gigs to avoid a location dependency in the main script.
- Keep synthetic sample photos free of real personal data. Use real hosted accounts only with the owner's authorization.
- Keep a separately prepared fallback device/emulator on the offline demo APK. Both APKs use the same Android package, so they replace one another on one device.
- If a network operation fails, explain it and move to the prepared offline device. Cached live reads do not make live writes work offline; drafts require explicit submission after reconnect.

Claims to avoid: ratings that have no data contract, automatic synchronization of queued marketplace writes, guaranteed AI inference, payment/escrow processing, or completed physical-device/Google OAuth acceptance without recorded evidence.
