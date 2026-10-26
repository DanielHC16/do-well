# Competition Android Build & Signing Guide

**Document:** `docs/COMPETITION_BUILD.md`  
**Milestone:** M14 — Verify security and produce competition build  
**Target Hardware:** Android API 36 / 37 (verified on physical Infinix X6840 and standard emulator)  
**Cost Budget:** Strictly PHP 0 / USD 0  

---

## 1. Build Architecture & Profiles

DO-WELL is an Expo SDK 58 application targeting Android API 36/37. All build and packaging configurations strictly preserve the zero-cost policy without relying on paid build tiers or expiring cloud credits.

### Build Profiles (`eas.json`):
- `development`: Internal distribution using `expo-dev-client`.
- `preview`: Internal distribution configured for standalone release APK generation (`"buildType": "apk"`).
- `production`: Intentionally omitted to prevent accidental unreviewed cloud submissions.

```json
{
  "cli": {
    "version": "25.3.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

---

## 2. Compilation Instructions

### A. Local Standalone Android Build (Guaranteed Zero-Cost)
Windows prerequisites checked on 2026-10-26: JDK 21 at `C:\Program Files\Java\jdk-21`, the Android SDK under `%LOCALAPPDATA%\Android\Sdk`, CMake `3.31.6` with Ninja `1.12.1`, and NDK `27.1.12297006`. Windows long-path support (`LongPathsEnabled=1`) is enabled. The `Pixel` emulator is online with the `x86_64` ABI.

Use the Expo Gradle property `expo.android.cmakeObjectPathMax=240` to shorten generated native object paths before they exceed Windows tool limits. The installed Expo plugin otherwise defaults this threshold to `1024`. This command applies the override without editing generated Android files or dependencies.

```powershell
# 1. Configure this PowerShell session
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

# 2. Verify the application
npm.cmd run typecheck
npm.cmd run test:run

# 3. Generate Android files when needed
npx.cmd expo prebuild --platform android

# 4. Compile a standalone release APK for the Pixel x86_64 emulator
cd android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 -Pexpo.android.cmakeObjectPathMax=240
cd ..
```

For the physical ARM64 Android device, build with `-PreactNativeArchitectures=arm64-v8a` instead. An APK built only for `x86_64` is intended for the emulator and does not establish physical-device acceptance.

The 2026-10-26 `x86_64` release build succeeded in 5m39s (879 tasks). APK v2 signature verification passed, `adb install` returned `Success`, and a cold launch on `emulator-5554` returned `Status: ok` in 1526ms. The preserved emulator artifact is ignored `.codex-artifacts/do-well-emulator-x86_64.apk`, SHA-256 `DFA8D1C18DB49360A3D8ECA02B1A2BD18168C3EFCFBEE63BE4FE3549D678A721`.

A separate ARM64 release build succeeded in 2m46s using the same object-path override, `--max-workers=2`, and `"-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m"`. APK v2 signature verification and the `arm64-v8a` native library check passed. Preserved ignored artifact: `.codex-artifacts/do-well-android-arm64.apk` (35,343,354 bytes), SHA-256 `828BDAC6CC1582604941E7168D9A3E172A86ECE1CE3B201C438DAE8CD9311F06`. Both APKs use the generated development signing key, not a production release key. No physical phone was connected, so physical-device installation and acceptance remain unverified. Emulator launch evidence is saved at ignored `.codex-artifacts/emulator-launch.png`.

Output artifact:
```text
android/app/build/outputs/apk/release/app-release.apk
```

Docker is required for the local Supabase database checks, independently of Android APK compilation. Docker Desktop `4.96.3`, Docker CLI `29.9.2`, and WSL `3.0.3` are installed, and firmware virtualization is enabled. A Windows restart is pending to activate the WSL/VirtualMachinePlatform prerequisites. After restarting, start Docker Desktop and verify `docker info` succeeds before running the local Supabase commands. Installation alone does not establish that the Docker engine or database checks are working.

### B. EAS Local Build on macOS/Linux (No Cloud Quota Consumed)
Expo supports EAS local builds on macOS and Linux; native Windows execution is unsupported. Windows users should use the verified Gradle instructions in Section A. See [Expo's local-build requirements](https://docs.expo.dev/build-reference/local-builds/).

```bash
npx --yes eas-cli@25.3.0 build --platform android --profile preview --local
```

### C. Static JavaScript Bundle Export Verification
To verify bundle compilation without native compilation:

```powershell
npx.cmd expo export --platform android
```
Expected output:
- Static Hermes bytecode bundle: `_expo/static/js/android/entry-*.hbc` (approx. 4.9MB).
- Asset metadata: `metadata.json`.

---

## 3. Artifact Verification & Checksum

Before submitting or transferring the competition APK:

1. **Calculate SHA-256 Checksum**:
   ```powershell
   Get-FileHash -Path "android/app/build/outputs/apk/release/app-release.apk" -Algorithm SHA256
   ```

2. **Verify Signature**:
   ```powershell
   $apksigner = "$env:LOCALAPPDATA\Android\Sdk\build-tools\37.0.0\apksigner.bat"
   & $apksigner verify --verbose "android/app/build/outputs/apk/release/app-release.apk"
   ```

3. **Install & Launch on Target Device**:
   ```powershell
   adb devices -l
   adb install -r "android/app/build/outputs/apk/release/app-release.apk"
   adb shell am start -n "com.anghulingpullrequest.dowell/com.anghulingpullrequest.dowell.MainActivity"
   ```

---

## 4. Signing Hygiene & Secret Separation

- The project repository does **not** track signing keys (`*.keystore`, `*.jks`, `secrets.properties`).
- All signing credentials must remain in local developer secure keystores or EAS secret vaults outside git.
- If evaluating on physical devices for judging, debug or ad-hoc release keystores are sufficient.
