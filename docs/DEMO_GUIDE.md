# Run, install, and present Do Well

Last checked: 2026-11-02 (Asia/Manila). All compilation uses the local Android SDK; no cloud build, card, billing, or paid service is required.

## Select the APK

There are two compile-time runtimes:

| Runtime             | Purpose                                                                                     | Requirements                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `production` (live) | Current redesigned marketplace, authenticated accounts, hosted operations                   | Internet, configured client-safe Supabase URL/publishable key, separately prepared employer and worker accounts |
| `demo` (offline)    | Fictional Maya/Alex lifecycle, local text submissions and approval, visible demo disclosure | No account, backend, or Metro; separate older sandbox interface                                                 |

Both use package `com.anghulingpullrequest.dowell` and version `0.1.0`; installing one replaces the other. They cannot run side by side as separate apps. Installing with `-r` normally retains app data when the signing certificate matches. Keep the live APK on the primary device and the offline APK on a fallback emulator/device. Never uninstall or clear storage to solve a signature mismatch without considering the existing drafts and session data.

The release variant embeds JavaScript and assets, so it starts without Metro. The generated local release configuration uses the development/debug signing key: suitable for a controlled demo, not a Play Store production release. Keys and APKs remain ignored and uncommitted.

Run native builds alone on this machine, with `--max-workers=1`; stop Metro exports and test workers first. A concurrent export/native build produced a Windows compiler file-open error even though the NDK header existed and was readable. The identical failed object compiled successfully in isolation with Ninja `-j1`. This is a host resource constraint, not evidence of a missing header.

## Start this machine's emulator and install

Run PowerShell in the repository root. Android Studio's Device Manager can also start **medium_phone**.

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
emulator -list-avds
Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList @('-avd', 'medium_phone') -WindowStyle Hidden
adb devices -l
```

Wait until the device appears as `device`, not `offline`; `adb -s emulator-5554 shell getprop sys.boot_completed` should return `1`. Substitute the serial shown by `adb devices` if different.

```powershell
adb -s emulator-5554 install -r .codex-artifacts/do-well-demo-offline.apk
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

Then build the offline artifact. All `-P` arguments are quoted because PowerShell can split dotted Gradle properties or comma-separated architecture lists:

```powershell
$env:EXPO_PUBLIC_APP_RUNTIME = 'demo'
$env:CI = '1'
.\android\gradlew.bat -p android assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' '-Pexpo.android.cmakeObjectPathMax=240' --max-workers=1 --no-daemon '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m'
New-Item -ItemType Directory -Force .codex-artifacts | Out-Null
Copy-Item -LiteralPath android/app/build/outputs/apk/release/app-release.apk -Destination .codex-artifacts/do-well-demo-offline.apk
```

For the live build, set `$env:EXPO_PUBLIC_APP_RUNTIME = 'production'` and force the JavaScript bundling task to run again before assembling:

```powershell
.\android\gradlew.bat -p android :app:createBundleReleaseJsAndAssets --rerun assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' '-Pexpo.android.cmakeObjectPathMax=240' --max-workers=1 --no-daemon '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m'
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

The offline reset is **Reset demo data → Reset** (visible home text: **Reset the local demo**). It affects synthetic demo state. For live recovery, preserve drafts, reconnect, refresh authoritative data, and explicitly resubmit; do not promise automatic queued writes. Hosted outage recovery is a prepared fallback APK/device, not a sign-in button or untested local database switch.

## Current artifact verification

Build, signature, ABI, checksum, and emulator results will be recorded here after the commands complete. Prior APK evidence in `COMPETITION_BUILD.md` belongs to earlier revisions and must not be treated as verification of these artifacts.
