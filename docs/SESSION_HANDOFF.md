# Session Handoff

## Snapshot

- **Last verified:** 2026-10-22 (Asia/Manila)
- **Completed milestone:** M01 — Expo initialization and Android development proof
- **Status:** `COMPLETED`; local APK compilation and emulator/physical-device launch evidence are proven
- **Branch:** `main` after merge; use a fresh branch for M02
- **Base/default branch:** `main`
- **Architecture baseline:** `85122ea` (`docs(architecture): define Phase 3 system design`)
- **Remote:** `https://github.com/DanielHC16/do-well`
- **Visibility:** `PRIVATE`
- **Issue:** [#2 — M01 Initialize Expo and prove Android development](https://github.com/DanielHC16/do-well/issues/2)
- **M01 PR:** [#17](https://github.com/DanielHC16/do-well/pull/17), squash-merged as `d073c4b`
- **M00 PR:** [#16](https://github.com/DanielHC16/do-well/pull/16), squash-merged

This file records repository evidence, not chat state. Re-run the verification commands before relying on it.

## Implemented on the M01 branch

- Pinned Node `22.23.2` in `.nvmrc` and npm `10.9.9` in `package.json`.
- Initialized the official Expo SDK 58 TypeScript/Expo Router scaffold with React Native 0.88 and package identity `com.anghulingpullrequest.dowell`.
- Added Jest 30, `jest-expo`, React Native Testing Library, ESLint, Prettier, strict TypeScript checks, and npm verification scripts.
- Added typed `app.config.ts` and tests for public identity, secret-shaped config fields, and the Windows Android CMake pin.
- Added an accessible neutral setup smoke screen that displays “Do Well” and “Development setup ready”.
- Added `expo-dev-client` and cost-safe `eas.json` development/preview profiles only; no production/submit profile exists.
- Kept EAS CLI out of project dependencies; use the exact on-demand `npx --yes eas-cli@25.3.0` command.
- Added `expo-build-properties` with Android CMake `3.31.6`. Its bundled Ninja supports the long native paths produced by Expo SDK 58's required New Architecture on Windows.
- Generated native Android files and APKs remain ignored.
- Installed and launched the debug APK on the `medium_phone` Android 15/API 35 emulator and an authorized Infinix X6840 running Android API 36.
- Verified the physical-device UI hierarchy exposes “Do Well” and “Development setup ready”; the non-sensitive screenshot is [`docs/evidence/m01-physical-device.png`](evidence/m01-physical-device.png).

Branch commits before the final documentation/status commit:

- `4f7dff6 chore(setup): pin supported Node and Android toolchain`
- `9b25cdc chore(setup): initialize Expo SDK 58 project`
- `1a57c3d test(setup): enforce Expo application configuration`
- `6af5dc1 chore(setup): add Android smoke screen`
- `78138ce chore(setup): format router layout`
- `877eb84 chore(android): configure zero-cost development builds`
- `672958d fix(setup): align EAS CLI with Expo Doctor`

## Verification evidence

The following passed on 2026-10-22 before draft PR publication; re-run after any change:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npx expo-doctor` — 20/20 checks
- `npx expo install --check`
- `npx --yes eas-cli@25.3.0 --version` — `eas-cli/25.3.0`
- public Expo config inspection — no secret-shaped field or privileged value
- `npx expo prebuild --platform android --clean --no-install`
- `.\android\gradlew.bat -p android assembleDebug --no-daemon` with Temurin JDK 17 — final patched-graph rebuild `BUILD SUCCESSFUL in 10m 6s`, 702 tasks

Local artifact evidence (ignored, not committed):

- File: `android/app/build/outputs/apk/debug/app-debug.apk`
- Size: `268,167,727` bytes
- SHA-256: `C0841CAAF1B0DA5A6EC8745E88A3AC0FFCE6C865A84C4B4570B06C0AF4DFAE1E`

The first native compile attempts exposed Windows/Ninja path failures with Android's default CMake 3.22.1/Ninja 1.10. A junction and a shorter worktree did not eliminate every generated path. The supported Expo SDK 57+ solution—`expo-build-properties` with CMake 3.31.6—then compiled successfully in the original workspace. Both temporary paths were removed after verification.

## Current local tool evidence

| Tool        | Observed                                       | Readiness                                                                            |
| ----------- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Node.js     | 22.23.2                                        | Ready; repository-pinned                                                             |
| npm         | 10.9.9                                         | Ready; repository-pinned                                                             |
| Java        | Eclipse Temurin JDK 17.0.10                    | Ready when explicitly selected; machine PATH still has an earlier Oracle Java 8 shim |
| Android SDK | Platform 37, Build-Tools 37.0.0, target SDK 36 | Ready                                                                                |
| Android NDK | 27.1.12297006                                  | Ready                                                                                |
| CMake/Ninja | CMake 3.31.6 / bundled Ninja 1.12+             | Ready; app config pin is tested                                                      |
| ADB         | Platform-Tools 35.0.2                          | Ready; `adb devices -l` returned no attached device                                  |
| EAS CLI     | 25.3.0 through exact `npx` invocation          | Ready; no global/local dependency                                                    |

The SDK also contains a pre-existing `platform-tools.backup` directory, so Android tooling emits a duplicate package-location warning. Its provenance is unknown and it was preserved.

## Dependency audit

After the final Expo-supported patch updates, `npm audit` reported 48 advisories: 18 moderate, 30 high, 0 critical. `npm audit --omit=dev` reported 40 runtime-tree advisories: 19 moderate, 21 high, 0 critical. These flow through the Expo/React Native/Jest supported dependency graph. npm's proposed broad fixes change or downgrade supported framework pins and may be breaking, so no `npm audit fix` or `--force` rewrite was applied. Reassess with Expo-supported upgrades; do not silently force the graph.

## External and cost state

- No EAS login, project link, cloud build, production build, submission, or billing action occurred.
- No Supabase project was linked and no database change occurred.
- No hosted GitHub Actions workflow was added because the required zero-dollar billing guard is not yet verified. Local checks are authoritative for M01.
- Existing environment/OAuth credential files were not opened or printed and remain ignored.
- No paid service or payment method was enabled.

## M01 physical-device acceptance evidence

1. `adb devices -l` detected one authorized physical phone: Infinix X6840, Android API 36.
2. `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` completed with `Success`.
3. `adb reverse tcp:8081 tcp:8081` exposed Metro only over the authorized USB connection.
4. Metro bundled 1,376 modules and launched `com.anghulingpullrequest.dowell/.MainActivity`.
5. The physical-device UI hierarchy contained `Do Well` and `Development setup ready`; [`docs/evidence/m01-physical-device.png`](evidence/m01-physical-device.png) records the non-sensitive screen.

M01 is complete and merged. Begin M02 on a fresh branch from updated `main`.

## Known local administration item

The user-scoped `JAVA_HOME` points to Temurin JDK 17, but the machine-wide Oracle Java 8 shim may take precedence in a newly opened shell. An administrator should remove/reorder that machine PATH entry. Until then, explicitly set JDK 17 for Android builds and verify both `java -version` and `javac -version`.

## Suggested continuation commands

```powershell
git status --short --branch
git diff --check
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npx expo-doctor
npx expo install --check
adb devices -l
```

## Stop conditions

Stop and update issue #2 instead of improvising if a step asks for billing, a paid plan, a privileged key in client code, destructive database action, history rewrite, production deployment, or unapproved product-feature implementation.
