# Competition demo script

Use [DEMO_GUIDE.md](DEMO_GUIDE.md) for APK installation, emulator commands, build details, and current verification. Rehearse the exact APK you will present.

## Choose the demonstration

The **live APK** runs the current marketplace interface against the configured Supabase project. It requires internet and separate employer and worker accounts. The **offline demo APK** starts directly in a disclosed synthetic sandbox, with fictional Maya and Alex presenters and local persistence. Its interface is separate from the redesigned marketplace. Runtime selection is compiled into the APK; there is no sign-in-screen “Demo Preview” switch.

Do not call the offline sandbox proof of hosted authentication, RLS, image upload, AI inference, payments, or remote notifications. No payment processing is implemented. Switching Find/Offer mode in the live app changes the current account's workspace; it does not sign in as another person.

## Reliable offline script: 3–4 minutes

1. **Introduce (20 seconds).** “Do Well helps people organize neighborhood work from a clear gig to an approved result. This demonstration uses fictional people and data stored on this device.” Point to the persistent demo disclosure.
2. **Post (40 seconds).** Start as **Maya · Employer**. Tap **＋ POST** (accessibility label: **Create and publish a gig**). Use title “Prepare community event checklist”, a description longer than 20 characters, category `admin`, Remote, and PHP 500. Tap **Create and publish**. This is a synthetic listing, not a hosted write.
3. **Apply (30 seconds).** Return home, choose **Alex · Worker**, open the new listing, enter a short message about helping, and submit the application.
4. **Select (30 seconds).** Return home, choose **Maya · Employer**, manage that listing, and select Alex. Open the assignment to show its active state.
5. **Submit (30 seconds).** Return home, choose **Alex · Worker**, open the assignment, enter a work note of at least 10 characters, and tap **Submit work**. This sandbox uses text notes, not uploaded photo evidence.
6. **Approve (30 seconds).** Return home, choose **Maya · Employer**, open the assignment, and tap **Approve completed work**. Show **Demo lifecycle complete** and the local activity timeline.
7. **Close (20 seconds).** “The live app extends this workflow with authenticated accounts, server-authorized operations, and private submission evidence. Hosted and physical-device acceptance are tracked separately.”

Use **Reset the local demo** (accessibility label: **Reset demo data**), then confirm **Reset**, before the next rehearsal. Reset affects only synthetic local demo progress. Two seeded gigs are available if time is short; use “Prepare event spreadsheet” to skip typing a new listing.

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
