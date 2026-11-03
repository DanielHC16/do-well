# Do Well

**Do Well** is an Android-first neighborhood gig marketplace designed for Philippine community conditions. It connects people offering short-term paid tasks with nearby or remote workers, with structured briefs, agreements, evidence submission and completion. It does not process payments or verify worker identity.

Built for the **UMAK IT Skills Olympics 2026**, Do Well follows a **PHP 0 / USD 0** external-service budget cap, with server authorization, local brief templates, weak-connectivity support and a standalone offline demo runtime.

---

For the current audit, emulator installation, standalone APKs and a rehearsable presentation, start with [the demo guide](docs/DEMO_GUIDE.md) and [readiness audit](docs/reports/2026-11-02-demo-readiness-audit.md). Hosted/device acceptance still has open checks in [#46](https://github.com/DanielHC16/do-well/issues/46).

## Install and run the APKs

The ready-to-install files are in the **`do-well-apk` folder at the repository root**. Download the actual `.apk` file, or download/extract this repository's ZIP to keep the folder structure. You can upload either APK to Google Drive and share it; recipients must download the file before installing it.

| APK                                                              | What it runs                             | Requirements                    |
| ---------------------------------------------------------------- | ---------------------------------------- | ------------------------------- |
| [do-well-live.apk](do-well-apk/do-well-live.apk)                 | The current authenticated marketplace    | Internet and a prepared account |
| [do-well-demo-offline.apk](do-well-apk/do-well-demo-offline.apk) | Fictional Maya/Alex demo with local data | No account or internet          |

Each file is about **60.5 MB** and supports ARM64 Android phones and x86_64 emulators, on Android 7.0 / API 24 or later. These are development-signed standalone builds for sideloading. Both use the same app package, so **installing one replaces the other**. Use separate devices if you want both available at once. Updates with `install -r` retain app data when signatures match; do not uninstall or clear storage merely to fix a signature mismatch without first considering saved sessions and drafts.

**You do not need Node.js, npm, Expo Go, Metro, Java, or a build command to run these APKs.** The JavaScript and assets are already included. Live backend operations still require internet.

### Run on an Android emulator (Windows)

1. Install [Android Studio](https://developer.android.com/studio) and finish its setup wizard.
2. Open **More Actions → SDK Manager** from the welcome screen, or **Tools → SDK Manager** inside a project. Install **Android SDK Platform-Tools**, **Android Emulator**, and an **Android 15 / API 35 x86_64 system image**. Note the SDK location; on this computer it is `%LOCALAPPDATA%\Android\Sdk`.
3. Open **More Actions → Virtual Device Manager** from the welcome screen, or **View → Tool Windows → Device Manager** inside a project. Choose **Create Virtual Device**, select a phone, and select the API 35 x86_64 image. Give it at least **8 GB of internal storage** in its advanced settings, then finish. On the project computer, the prepared device is already named **`do_well_demo_api35`**; use it instead of creating another one. The older `medium_phone` is short of storage.
4. Click the device's **Run/Play** button. Wait for the Android home screen and unlock the emulator if needed.
5. Open PowerShell **in this repository's root folder**, containing `do-well-apk`. Set the SDK path and check the connected devices:

   ```powershell
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"
   adb devices -l
   ```

   If SDK Manager showed a different location, use that value for `ANDROID_HOME`. Find the emulator's serial, usually `emulator-5554`. Its state must be `device`, not `offline`. The following boot check must return `1`; wait and repeat it if Android is still starting:

   ```powershell
   adb -s emulator-5554 shell getprop sys.boot_completed
   ```

6. Install and open the actual app. Substitute the serial listed above if it differs:

   ```powershell
   adb -s emulator-5554 install -r .\do-well-apk\do-well-live.apk
   adb -s emulator-5554 shell am start -W -n com.anghulingpullrequest.dowell/.MainActivity
   ```

   Wait for `Success` from installation. To run the offline demo instead, install its APK and open the same app:

   ```powershell
   adb -s emulator-5554 install -r .\do-well-apk\do-well-demo-offline.apk
   adb -s emulator-5554 shell am start -W -n com.anghulingpullrequest.dowell/.MainActivity
   ```

No development server is needed. If installation reports insufficient storage, free space without deleting important app data, or create a fresh virtual device with more internal storage. If Android reports an incompatible signature, preserve existing data and decide deliberately whether to uninstall the older app. See the official [virtual-device setup](https://developer.android.com/studio/run/managing-avds) and [ADB installation/device commands](https://developer.android.com/tools/adb).

### Install on a phone plugged in by USB (Windows)

1. Install **Android SDK Platform-Tools** using Android Studio's SDK Manager. In PowerShell, open the repository root and run the `ANDROID_HOME` / `Path` setup above. Android Studio itself does not need to stay open.
2. On the phone, open **Settings → About phone** and tap **Build number seven times** to enable Developer options. On some brands Build number is under **Software information**; enter the phone's PIN if prompted.
3. Open **Developer options** in Settings and enable **USB debugging**.
4. Connect the unlocked phone to the computer using a **USB data cable**. A charging-only cable will not work. If prompted for a USB mode, choose **File transfer**. Accept **Allow USB debugging?** on the phone after checking the computer's RSA fingerprint prompt; select “Always allow” only on a computer you trust.
5. In PowerShell, list devices:

   ```powershell
   adb devices -l
   ```

   The phone must appear with state `device`. If it says `unauthorized`, unlock it and accept the debugging prompt. If no phone appears, try another data cable/USB port, reconnect with the phone unlocked, and check the manufacturer's Windows USB driver. See [Android's physical-device setup](https://developer.android.com/studio/run/device).

6. Copy the **phone's serial** from the first column; do not use an emulator serial. Replace `YOUR_PHONE_SERIAL` below, then install and launch:

   ```powershell
   $phoneSerial = 'YOUR_PHONE_SERIAL'
   adb -s $phoneSerial install -r .\do-well-apk\do-well-live.apk
   adb -s $phoneSerial shell am start -W -n com.anghulingpullrequest.dowell/.MainActivity
   ```

   To show the offline sandbox, replace the installation path with `.\do-well-apk\do-well-demo-offline.apk`, then run the same launch command. Expect `Success` from installation. Selecting the serial explicitly also works when a phone and emulator are both connected.

7. Open **Do Well** from the phone's app drawer afterward. You can disconnect USB once installation finishes; the standalone app does not use `adb reverse` or Metro. Disable USB debugging afterward if you no longer need it.

Alternatively, without ADB: connect using File transfer, copy an APK into the phone's **Download** folder, then open it in the phone's Files app. Or download it from your shared Google Drive link on the phone. When Android asks, allow that browser/Files app to **install unknown apps**, finish installation, and turn that allowance off again afterward. USB debugging is not needed for this file-based installation method.

### Present the demo

For the offline walkthrough, install `do-well-demo-offline.apk`. As **Maya**, post a gig, review Alex's automatic application, select Alex, open the submitted work, and approve it. As **Alex**, apply to an available gig, open the automatically accepted assignment, and submit a work note; Maya's approval completes it automatically. Each path works without repeatedly switching accounts.

Use **Settings → Switch account** to choose Maya (employer) or Alex (worker). Settings also contains the confirmed reset for a fresh walkthrough. Existing pending applications recover on startup. Product screens use ordinary marketplace language; this offline APK still uses fictional accounts, local data and simulated counterpart responses. It does not contact real employers or process payments. See the [full walkthrough](docs/DEMO_RUNBOOK.md).

The live APK uses the redesigned marketplace and hosted backend. Sign in with prepared separate employer and worker accounts for a two-person workflow. **Find/Offer switches workspaces, not accounts.** Complete account setup and permission prompts before presenting. The complete offline lifecycle and live email sign-in/Settings save were verified on the prepared API 35 emulator; broader OAuth, physical-phone, GPS, and photo acceptance remains [#46](https://github.com/DanielHC16/do-well/issues/46).

See the [step-by-step presentation script](docs/DEMO_RUNBOOK.md) and [build/signature/checksum evidence](docs/DEMO_GUIDE.md). Choose remote gigs for the main presentation so GPS is not a dependency. Keep the offline APK on a separate fallback device if possible.

## Implemented capabilities

1. **Dual-Mode Noticeboard Shell (M04)**:
   - Unified authenticated account supporting instant switching between **Employer** and **Worker** modes.
   - Accessible noticeboard with high-contrast UI, custom design tokens, and bottom tab navigation.
2. **Gig Creation & Management (M05)**:
   - Structured gig posting with strict domain validation across 8 categories, 3 work modes, budget limits, and area constraints.
   - Persistent local draft store surviving app restarts.
   - Security-definer SQL RPCs (`publish_gig`, `close_gig`) enforcing owner isolation and state machine integrity.
3. **Nearby Discovery & Explainable Ranking (M06, M11)**:
   - One-shot foreground-only GPS location with 5-second timeout (`expo-location`); zero background tracking.
   - Parameterized SQL RPC (`discover_gigs`) computing spherical Haversine distance bands (`< 5 km`, `< 15 km`) and explainable recommendation reasons.
   - Coarse public locality privacy masking: exact coordinates and addresses are never exposed to workers prior to agreement.
4. **Worker Applications & Atomic Selection (M07)**:
   - Worker bid submission with proposed rates and structured pitches.
   - Atomic database transaction (`select_worker_for_gig`) that accepts the winning worker, transitions gig status, and automatically closes competing applications.
5. **Agreements, Milestones & Activity Timeline (M08)**:
   - Contract locking with agreed rate, deliverables checklist, and milestone tracking.
   - Chronologically ordered audit trail (`activity_events`) recording all significant lifecycle events.
6. **Work Submission & Image Evidence (M09, M12)**:
   - Worker submission note with private photo evidence capture (`expo-image-picker`).
   - Private Supabase Storage bucket (`submission-evidence`) with client-side EXIF stripping, 5MB file cap, allowlisted image MIME types (JPEG, PNG, WEBP), and max 5 files.
   - Short-lived signed URLs for employer review; public read access is strictly forbidden by RLS.
7. **Local Notification Engine (M12)**:
   - On-device local notification dispatch (`expo-notifications`) across 3 configured Android channels (`assignment_updates`, `milestone_alerts`, `general_alerts`).
   - Deduplicated alerts derived from unread activity events; zero paid FCM or third-party push dependencies.
8. **Weak-Connectivity Resilience (M13)**:
   - Real-time network reachability detection via `expo-network`.
   - Global high-contrast amber `OfflineBanner` and `StaleDataBadge` showing snapshot timestamps.
   - User-scoped bounded read cache (`@dowell/cache/{userId}/{key}`) in AsyncStorage with 50-entry LRU cap and automatic purge on sign-out.
   - Persistent form draft stores for worker bids and evidence notes.
   - 12-second bounded mutation timeouts and reconciliation helpers to prevent duplicate server writes.
9. **Zero-Cost Brief Builder (M10)**:
   - Transforms unstructured employer task descriptions into structured, safety-checked job briefs.
   - Default operation uses a deterministic local template/rules engine without an external model provider. Present this as structured assistance, not demonstrated AI inference.
10. **Offline Job-Cycle Demo (D01)**:
    - Self-contained offline demonstration sandbox using fictional personas (_Maya Santos_ & _Alex Reyes_) and synthetic local data.
    - Zero network, Docker, or Supabase credentials required for judging.
    - Automatic counterpart responses let either role finish posting/application, selection, submission and approval without repeatedly switching accounts.
    - Account switching and confirmed workspace reset live in Settings; progress persists across restarts.

---

## Repository & Budget Guardrails

- **Budget Cap**: Strictly **PHP 0 / USD 0**. No credit cards, billing accounts, or services that can generate automatic overage charges.
- **Secret Hygiene**: Zero tracked secrets in git or client bundles. All environment secrets are gitignored; only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are exposed to the client.
- **Database Security**: 100% of tables and storage objects are protected by PostgreSQL Row Level Security (RLS) and tested with pgTAP.

---

## Quality Gates & Verification Matrix

Historical milestone completion is recorded in the roadmap; it does not establish complete hosted authentication or physical-device acceptance. Run these checks on the current revision and consult the [session handoff](docs/SESSION_HANDOFF.md) for recorded results:

| Quality Gate              | Command                              | Status                                                 |
| :------------------------ | :----------------------------------- | :----------------------------------------------------- |
| **Jest Test Suite**       | `npm run test:run`                   | Unit/component/domain tests; excludes HTTP integration |
| **TypeScript**            | `npm run typecheck`                  | Strict mobile typecheck; video composition is separate |
| **ESLint**                | `npm run lint`                       | Mobile lint                                            |
| **Prettier**              | `npm run format:check`               | Mobile/source formatting                               |
| **Expo Doctor**           | `npx expo-doctor`                    | SDK compatibility                                      |
| **Hermes Android Bundle** | `npx expo export --platform android` | Bundle compilation; not an APK                         |
| **Database Contract**     | `npm run db:test`                    | Disposable local Supabase required                     |
| **HTTP integration**      | `npm run test:auth:integration`      | Separate local Auth/JWT and multi-principal workflows  |

---

## Optional: develop from source with Metro

Use this section only when changing the app. For installation and presentation, use the ready-made APK steps above.

Install the pinned Node.js **22.23.2**, npm **10.9.9**, **JDK 21**, Android SDK Platform **37**, Build-Tools **37.0.0**, CMake **3.31.6**, and the native toolchain described in [the demo/build guide](docs/DEMO_GUIDE.md). Configure only client-safe Supabase values locally for live development, following `.env.example`; never share `.env.local` or private credentials.

In PowerShell at the repository root, after selecting Node 22.23.2 (for example `nvm use 22.23.2` where nvm is installed):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
npm.cmd ci
$env:EXPO_PUBLIC_APP_RUNTIME = 'production'
npx.cmd expo run:android --device
```

Adjust `JAVA_HOME` and `ANDROID_HOME` to your installations. Select the booted emulator or authorized USB phone in Expo's device picker. This command compiles/installs a development client and starts Metro. For subsequent JavaScript-only sessions, run `npx.cmd expo start --dev-client` and open the development app. Native dependency/configuration changes require rebuilding the client.

For **USB development with Metro only**, forward the development server to the phone while keeping USB connected:

```powershell
adb -s YOUR_PHONE_SERIAL reverse tcp:8081 tcp:8081
```

Set `$env:EXPO_PUBLIC_APP_RUNTIME = 'demo'` before starting the development build/bundler to use the synthetic sandbox; use `'production'` to return to live. Restart Metro after changing runtime. This variable does not change an already-installed standalone APK.

Run `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run test:run` before submitting source changes. APK hashes and emulator rehearsal results are recorded in [DEMO_GUIDE.md](docs/DEMO_GUIDE.md).

---

## Competition & Operations Runbooks

- **Competition Judging Script**: [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) — 3-5 minute live judging script and feature showcase.
- **Android Compilation & Checksum**: [`docs/COMPETITION_BUILD.md`](docs/COMPETITION_BUILD.md) — Release APK commands, apksigner, and checksum generation.
- **Disaster Recovery**: [`docs/DISASTER_RECOVERY.md`](docs/DISASTER_RECOVERY.md) — Presentation contingency matrix and database recovery procedures.
- **Implementation Roadmap**: [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md) — Milestone delivery history and verification proofs.
- **Session Handoff**: [`docs/SESSION_HANDOFF.md`](docs/SESSION_HANDOFF.md) — Detailed operational snapshot.
