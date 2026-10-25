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
Using the pinned Gradle and CMake toolchain verified in M01:

```powershell
# 1. Clean and verify prerequisites
npm run typecheck
npm run test:run

# 2. Local Android Prebuild
npx expo prebuild --platform android --clean

# 3. Compile Standalone Release APK
cd android
./gradlew assembleRelease
cd ..
```

Output artifact:
```text
android/app/build/outputs/apk/release/app-release.apk
```

### B. On-Demand EAS Local Build (No Cloud Quota Consumed)
If using `eas-cli` with local compilation flags:

```powershell
npx --yes eas-cli@25.3.0 build --platform android --profile preview --local
```

### C. Static JavaScript Bundle Export Verification
To verify bundle compilation without native compilation:

```powershell
npx expo export --platform android
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
