# Run, install, and present Do Well

Last checked: 2026-11-04 (Asia/Manila). All compilation uses the local Android SDK; no cloud build, card, billing, or paid service is required.

The shareable APKs are version-controlled in the root [`do-well-apk/`](../do-well-apk/) folder: [live app](../do-well-apk/do-well-live.apk) and [updated complete-cycle offline demo](../do-well-apk/do-well-demo-offline.apk). Replace older shared offline copies with this updated file. The [README](../README.md#install-and-run-the-apks) contains complete emulator and USB-phone installation steps. Current offline verification is below; the live binary remains unchanged. Local build staging/logs stay under ignored `.codex-artifacts/`.

## Select the APK

There are two compile-time runtimes:

| Runtime             | Purpose                                                                                                 | Requirements                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `production` (live) | Current redesigned marketplace, authenticated accounts, hosted operations                               | Internet, configured client-safe Supabase URL/publishable key, separately prepared employer and worker accounts |
| `demo` (offline)    | Fictional Maya/Alex lifecycle with automatic counterpart responses, local text submissions and approval | No account, backend, or Metro; standalone local interface                                                       |

Both use package `com.anghulingpullrequest.dowell` and version `0.1.0`; installing one replaces the other. They cannot run side by side as separate apps. Installing with `-r` normally retains app data when the signing certificate matches. Keep the live APK on the primary device and the offline APK on a fallback emulator/device. Never uninstall or clear storage to solve a signature mismatch without considering the existing drafts and session data.

The release variant embeds JavaScript and assets, so it starts without Metro. The generated local release configuration uses the development/debug signing key: suitable for a controlled demo, not a Play Store production release. Signing keys and generated build output stay ignored; only the two owner-authorized distribution APKs in `do-well-apk/` are committed.

Run native builds alone on this machine, with `--max-workers=1`; stop Metro exports and test workers first. A concurrent export/native build produced a Windows compiler file-open error even though the NDK header existed and was readable. The identical failed object compiled successfully in isolation with Ninja `-j1`. This is a host resource constraint, not evidence of a missing header.

## Start this machine's emulator and install

Run PowerShell in the repository root. Android Studio's Device Manager can also start **do_well_demo_api35**.

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
emulator -list-avds
Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList @('-avd', 'do_well_demo_api35') -WindowStyle Hidden
adb devices -l
```

Wait until the device appears as `device`, not `offline`; `adb -s emulator-5554 shell getprop sys.boot_completed` should return `1`. Substitute the serial shown by `adb devices` if different.

This session created `do_well_demo_api35` using the already installed Android 15 / API 35 Google Play x86_64 image, with a fresh 8GB data partition. Its files are in the ignored `.codex-artifacts/do-well-demo-api35.avd/` directory. The older `medium_phone` emulator has only about 337MB free; Android refused APK installation there even after safe cache trimming. Its existing apps, sessions, and drafts were preserved. Use the new AVD for the demo; keep that ignored directory if you want to retain it. On another computer, create an API 35 x86_64 virtual device with at least 8GB internal storage in Android Studio and substitute its name.

```powershell
adb -s emulator-5554 install -r do-well-apk/do-well-demo-offline.apk
adb -s emulator-5554 shell am force-stop com.anghulingpullrequest.dowell
adb -s emulator-5554 shell am start -W -n com.anghulingpullrequest.dowell/.MainActivity
```

Use the live artifact path instead when showing the current marketplace. Neither standalone APK needs an Expo development server. Android API 35 / x86_64 is the currently available emulator; fresh physical-device acceptance must be checked separately.

## Install on an Android phone

Copy the desired APK to the phone, open it in Files, allow installation from that source when Android prompts, and install. Alternatively enable USB debugging, accept the computer's fingerprint on the phone, use `adb devices -l` to get its serial, then run `adb -s PHONE_SERIAL install -r APK_PATH`.

These artifacts target ARM64 phones and x86_64 emulators. A different ABI needs a corresponding native build. A signature mismatch can mean the existing app was signed elsewhere; retain its data and seek an explicit uninstall decision. This session does not clear a physical phone's storage.

## Development build with Metro

Use the pinned Node and a session-local Java selection; this machine's default `java` may still resolve to Java 8. Existing Node `22.23.2` is installed here:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "C:\Users\Hardy\AppData\Local\nvm\v22.23.2;$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
node --version
java -version
npm.cmd ci
$env:EXPO_PUBLIC_APP_RUNTIME = 'production'
npx.cmd expo run:android --device
```

The last command installs a development build and starts Metro. Subsequent JavaScript-only sessions can use `npx.cmd expo start --dev-client`; press `a` to open Android. For USB connectivity, `adb -s DEVICE_SERIAL reverse tcp:8081 tcp:8081` forwards Metro. Stop Metro with Ctrl+C. Native configuration/dependency changes require rebuilding the development client.

To run the sandbox during development, set `$env:EXPO_PUBLIC_APP_RUNTIME = 'demo'` before starting Metro; restart the bundler when changing runtimes. To return to live use `production`. The runtime is compiled into standalone APKs; setting this environment variable after installing an APK cannot change that APK.

## Rebuild standalone APKs locally

Keep `.env.local` local. Only the public Supabase URL and publishable key belong in client configuration; no provider secret, database password, service-role key, or signing secret belongs in `EXPO_PUBLIC_*`. Runtime environment overrides below do not edit that file.

With the session setup above and dependencies present, generate ignored Android files if needed:

```powershell
npx.cmd expo prebuild --platform android --no-install
```

For this machine's bounded build, set the following line in the generated, ignored `android/app/build.gradle` inside its `react { ... }` block after prebuild. This limits Metro as well as Gradle; prebuild can regenerate the file:

```groovy
extraPackagerArgs = ["--max-workers", "1"]
```

Then build the offline artifact. All `-P` arguments are quoted because PowerShell can split dotted Gradle properties or comma-separated architecture lists:

```powershell
$env:EXPO_PUBLIC_APP_RUNTIME = 'demo'
$env:CI = '1'
.\android\gradlew.bat -p android :app:createBundleReleaseJsAndAssets --rerun :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' '-Pexpo.android.cmakeObjectPathMax=240' --max-workers=1 --no-daemon '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m'
New-Item -ItemType Directory -Force .codex-artifacts | Out-Null
Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination .codex-artifacts/do-well-demo-offline.apk
```

For the live build, change the runtime and force the JavaScript bundling task to run again before assembling:

```powershell
$env:EXPO_PUBLIC_APP_RUNTIME = 'production'
.\android\gradlew.bat -p android :app:createBundleReleaseJsAndAssets --rerun :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' '-Pexpo.android.cmakeObjectPathMax=240' --max-workers=1 --no-daemon '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m'
Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination .codex-artifacts/do-well-live.apk
```

The task-specific `--rerun` prevents a previous runtime's embedded JavaScript being reused while retaining valid native compilation outputs ([Gradle task options](https://docs.gradle.org/current/userguide/command_line_interface.html#sec:rerun_tasks)). Do not copy a stale previous `app-release.apk` after a failed build. The architecture list includes both phone ARM64 and emulator x86_64.

Verify the copied artifact:

```powershell
Get-FileHash .codex-artifacts/do-well-demo-offline.apk -Algorithm SHA256
& "$env:ANDROID_HOME\build-tools\37.0.0\apksigner.bat" verify --verbose .codex-artifacts/do-well-demo-offline.apk
```

Expo SDK 58 references: [local app compilation](https://docs.expo.dev/guides/local-app-development/), [local production builds](https://docs.expo.dev/guides/local-app-production/), [development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/). The installed SDK and Gradle configuration govern this repository's exact output and signing.

## Demo procedure and recovery

Follow the [3–4 minute script](DEMO_RUNBOOK.md). Use the offline APK for a reliable fictional lifecycle and the live APK for current UI/backend capabilities that have actually been rehearsed. “Find”/“Offer” on one live account are workspaces, not a two-person authentication demonstration.

In the updated offline APK, **Settings** contains account switching and the confirmed local reset. Maya can post → review the automatic application → select → review the automatic submission → approve. Alex can apply → open the automatically accepted assignment → submit → receive automatic approval. Existing pending applications recover on startup without clearing data. Product screens use ordinary app copy under [ADR 0010](adr/0010-offline-demo-counterpart-progression.md); accounts and counterpart decisions remain local simulations. For live recovery, preserve drafts, reconnect, refresh authoritative data, and explicitly resubmit; do not promise automatic queued writes.

## Current complete-cycle offline APK

Rebuilt locally on 3 November 2026 from frozen application source `67bebeb00229eef60148d80172411121bbf7a4cd`. Share this updated file:

| Artifact                               |      Bytes | SHA-256                                                            |
| -------------------------------------- | ---------: | ------------------------------------------------------------------ |
| `do-well-apk/do-well-demo-offline.apk` | 60,498,386 | `EA03C652ED36378D0829A554F28DBE24906B2FD86CF3217725F7E59FC988FE69` |

Build exited successfully in 1m48s (834 tasks). APK Signature Scheme v2 verifies with one development signer. Archive checks confirm ARM64/x86_64 support, an embedded 4,363,112-byte JavaScript bundle, no bundled `.env`/keystore, and no matches for the five local private credential values inspected in-process. The 314-file source manifest remained unchanged across compilation (SHA-256 `18fa1dfdaf13c1ebc6fd0faeeac81ec762229acb64f9ca468c98d8972bbe160d`). Local logs/manifest: `.codex-artifacts/demo-v2-build.log`, `.codex-artifacts/demo-v2-source-manifest.json`.

Fresh source checks: formatting, lint and strict TypeScript pass; **118 suites / 733 tests** pass. Targeted regressions were observed failing before the fixes, and independent source review is LGTM. The live APK is unchanged and retains its previously verified checksum below.

Actual updated-APK acceptance on 4 November, `do_well_demo_api35` / API35 / x86_64, with airplane mode on and Wi-Fi/mobile data off:

- `adb install -r` succeeded over the prior offline APK and retained the selected Alex account. No uninstall or storage clear.
- Employer: created **Complete cycle rehearsal**, received Alex's application automatically, selected Alex, reviewed the automatically submitted note and approved it. **Work completed**, completed status and all five timeline events were inspected. Maya stayed selected throughout.
- Worker: changed to Alex through **Settings**, applied to **Prepare event spreadsheet**, saw **You got the job**, opened the accepted assignment, submitted a note and received automatic approval. Completed status and all five timeline events were inspected.
- Cold restarts retained each role and its completed assignment. Settings account switching and ordinary product copy were inspected, including the upgraded seed description. Neither role's cycle required an intermediate account switch or Metro.
- Confirmed **Settings → Reset workspace → Reset** restored Maya's starter listings with no completed assignments. Rehearsal exited0 with eight PASS checks. Emulator left on the updated offline APK, Maya's starting workspace, airplane mode on, Wi-Fi/mobile data off, ready for presentation.

Local evidence: `.codex-artifacts/demo-cycle-v2-rehearsal.log`, `demo-cycle-v2-home.png`, `demo-cycle-v2-settings.png`, `demo-cycle-v2-employer-review.png`, `demo-cycle-v2-employer-complete.png`, `demo-cycle-v2-worker-accepted.png`, `demo-cycle-v2-worker-complete.png`, and `demo-cycle-v2-worker-timeline.png` in the same ignored directory. Recovery of saved pending applications, failed saves/retries and old custom posts is covered by automated regressions; a pending application was not successfully seeded through the older device UI before upgrading, so no separate device proof of that specific legacy state is claimed. Earlier launcher ANRs and stale automation taps were resolved in the emulator/harness without changing app source or deleting storage. No physical phone was connected; #46 remains open.

## Previous artifact verification (before complete-cycle repair)

Built locally on 3 November 2026 from application source `67b6c774cd399b80fb9347d3c036cac203038206` (PR #48). Both standalone APKs are copied unchanged into the tracked root `do-well-apk/` directory for sharing; ignored build-staging copies remain under `.codex-artifacts/`:

| Artifact                   |      Bytes | SHA-256                                                            |
| -------------------------- | ---------: | ------------------------------------------------------------------ |
| `do-well-live.apk`         | 60,496,430 | `95AEC80101C992D02712AC4A08649DE7355B39FDE36C906D1B71F43164FA8BCB` |
| `do-well-demo-offline.apk` | 60,496,430 | `65B1ED12AAA1234B5EEB3BCAA6513F06C4851218B9E3DBB50F583DE2AE8A27D8` |

Both builds exited successfully (offline: 1m25s; live: 56s). Android `apksigner` verified APK Signature Scheme v2 for both, with one development signer. Archive inspection confirmed `arm64-v8a` and `x86_64` libraries and an embedded 4,361,156-byte JavaScript bundle in each. Minimum Android API is 24; target API is 36. In-process privacy inspection found no matches for the five local private credential values checked and no bundled `.env` or keystore files; credential values were not logged.

The ignored final source manifest covers 203 application/configuration/package/asset files; all remained unchanged across both builds. Its SHA-256 is `23f6eefd1f05f494be225f9b15ac792c046ba24fa09f436543ea157e02514243`. Logs are `.codex-artifacts/apk-demo-final-build.log` and `.codex-artifacts/apk-live-final-build.log`. Documentation/distribution-only commits after the source revision do not change these binaries. The owner explicitly authorized committing the two APK snapshots in `do-well-apk/`; signing keys, account credentials and generated build output remain excluded.

On the isolated `do_well_demo_api35` AVD (Android 15 / API 35, x86_64, 1080×2400), the final offline APK installed successfully with `adb install -r` and cold-launched in 3.067s without Metro. Airplane mode was enabled and Wi-Fi/mobile data disabled. The actual UI rehearsal created a new listing, applied as Alex, selected Alex as Maya, submitted a work note as Alex, and approved it as Maya; **Demo lifecycle complete** was visible. **Reset demo data → Reset** succeeded and returned the presenter to Maya's starting home. Screenshots are ignored local files `.codex-artifacts/apk-demo-first-launch.png` and `.codex-artifacts/apk-demo-lifecycle-complete.png`; the successful rehearsal log is `.codex-artifacts/apk-demo-rehearsal.log`.

After connectivity was restored, the final live APK installed successfully with `adb install -r` and cold-launched in 3.858s without Metro. An existing authorized employer test account signed in with email/password. The redesigned Home loaded, Profile → Settings opened through the fresh capability query, changing the server-backed default workspace showed **Default workspace updated.**, and the original default was restored successfully. No account was created or granted administrator access. Screenshots are `.codex-artifacts/apk-live-home.png`, `.codex-artifacts/apk-live-settings.png`, and `.codex-artifacts/apk-live-settings-saved.png`; the successful rehearsal log is `.codex-artifacts/apk-live-rehearsal.log`. Credentials were handled only inside the local rehearsal process and were not logged.

At that previous checkpoint, the prepared emulator had the live APK installed, connectivity enabled, and the authorized test employer signed in. The current complete-cycle rehearsal above replaces that emulator state with the updated offline APK. Prior APK evidence in `COMPETITION_BUILD.md` belongs to earlier revisions. No physical phone was connected. These older checks establish one working hosted email sign-in/settings path and the original synthetic offline lifecycle; they do not close the broader OAuth/device/GPS/photo or full hosted multi-principal acceptance matrix in issue #46.
