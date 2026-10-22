# Windows Development Setup Guide

## Status and target

M01 corrected the local Node and Android toolchain, initialized the Expo SDK 58 scaffold, and added cost-safe local/EAS build configuration on 2026-10-22. Physical-device build proof remains pending.

Target baseline, revalidated on 2026-10-22:

- Windows PowerShell
- Node.js `22.23.2` pinned in `.nvmrc`
- npm `10.9.9` pinned in `package.json#packageManager`
- Expo SDK `58` / React Native `0.88`
- JDK 17
- Android SDK Platform 37, Build-Tools 37.0.0, target SDK 36, CMake 3.31.6, Android platform-tools/ADB
- on-demand pinned `eas-cli@25.3.0` through `npx`; Supabase CLI deferred to its approved milestone

Expo SDK 58 requires Node 22.13.x or newer and uses Android compile SDK 37/target SDK 36 ([Expo SDK reference](https://docs.expo.dev/versions/v58.0.0/)); the SDK 58 build-properties reference uses Build-Tools 37.0.0 ([Expo BuildProperties](https://docs.expo.dev/versions/latest/sdk/build-properties/)). Expo's SDK 58 Android build image uses Java 17 and Node 22.23.2, which is why this plan pins those versions ([EAS build infrastructure](https://docs.expo.dev/build-reference/infrastructure/)). The SDK 58 template is explicitly selected because the default scaffold may remain on SDK 57 during the transition ([create an Expo project](https://docs.expo.dev/get-started/create-a-project/)).

## Current machine findings

| Check                        | Current state                                                                                                  | Required action before M01                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node                         | `22.23.2` selected through nvm-windows 1.2.2                                                                   | Ready; repository pin is in `.nvmrc`                                                                                                                               |
| npm                          | `10.9.9`                                                                                                       | Ready; matching `packageManager` pin and lockfile are present                                                                                                      |
| pnpm                         | `12.8.1`                                                                                                       | Not selected; do not create a second lockfile                                                                                                                      |
| `java` / `javac`             | Eclipse Temurin 17.0.10 when the verified JDK is selected                                                      | User `JAVA_HOME` and PATH are aligned; the machine-wide Oracle Java 8 shim can still win in a newly opened shell and must be removed/reordered by an administrator |
| Android SDK                  | `%LOCALAPPDATA%\Android\Sdk`; Platform 37.0, Build-Tools 37.0.0, NDK 27.1.12297006, and CMake 3.31.6 installed | Ready; CMake 3.31.6 supplies Ninja 1.12+ for Windows long-path support                                                                                             |
| ADB                          | Platform-Tools 35.0.2 installed and added to user PATH                                                         | Ready; no physical device was attached during Task 1                                                                                                               |
| `ANDROID_HOME`               | Set at user scope to `%LOCALAPPDATA%\Android\Sdk`                                                              | Ready                                                                                                                                                              |
| Expo app/lockfile            | Expo SDK 58 scaffold and npm lockfile present                                                                  | Ready for local verification                                                                                                                                       |
| Legacy global Expo CLI       | Previously detected                                                                                            | Do not use it; use project-local `npx expo`                                                                                                                        |
| EAS CLI / development client | `eas-cli` 25.3.0 pinned in `eas.json` and invoked on demand; Expo resolved `expo-dev-client` 58.0.14           | Ready for local development builds; no EAS project was linked and no cloud build was invoked                                                                       |
| Supabase CLI                 | Not project-pinned                                                                                             | Add only in the approved Supabase milestone                                                                                                                        |

## 1. Select Node and npm

For this machine the install/select step is complete. On a clean workstation, run:

```powershell
nvm install 22.23.2
nvm use 22.23.2
npm install --global npm@10.9.9
node --version
npm --version
```

Expected: `v22.23.2` and `10.9.9`. Add `.nvmrc` containing `22.23.2` and later set `"packageManager": "npm@10.9.9"`. Commit `package-lock.json`; do not generate yarn/pnpm/bun lockfiles.

Do not use the deprecated global `expo-cli`. After the project exists, `npx expo ...` resolves the compatible local Expo CLI.

## 2. Correct Java 17 selection

The machine has JDK 17 at the `JAVA_HOME` location. M01 set user `JAVA_HOME` and placed its `bin` first in the user PATH. The Oracle Java 8 shim remains in the machine PATH, which Windows evaluates before the user PATH. An administrator must remove or move that machine-wide entry before relying on a newly opened shell without a session override. In **System Properties > Environment Variables**:

1. keep/set user `JAVA_HOME` to the installed JDK 17 directory;
2. keep `%JAVA_HOME%\bin` first in the user PATH;
3. move/remove the machine-wide `C:\Program Files (x86)\Common Files\Oracle\Java\java8path` entry;
4. open a new PowerShell window.

Do not rewrite the full PATH with `setx`; it can lose or truncate entries. Verify:

```powershell
where.exe java
java -version
javac -version
```

Both compiler and runtime must report Java 17 from the same JDK family/path before Gradle is run.

## 3. Configure Android SDK and ADB

M01 installed the required packages through the official command-line SDK Manager and accepted the official Android licenses. In **Android Studio > SDK Manager**, verify:

- Android SDK Platform 37.0 (`platforms;android-37.0` in `sdkmanager`);
- Android SDK Platform 36 (target compatibility/tools as needed);
- Android SDK Build-Tools 37.0.0;
- Android SDK Platform-Tools;
- Android SDK Command-line Tools (latest);
- CMake 3.31.6 (`cmake;3.31.6` in `sdkmanager`);
- one emulator image only if emulator testing is desired.

User `ANDROID_HOME` is set to:

```text
%LOCALAPPDATA%\Android\Sdk
```

These existing directories were added to the user PATH:

```text
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\cmdline-tools\latest\bin
```

`ANDROID_SDK_ROOT` is not required when `ANDROID_HOME` is correct; if another tool sets both, they must resolve to the same directory. Open a new terminal and verify:

```powershell
adb version
sdkmanager --list
```

On Windows, Expo SDK 58's New Architecture can create native object paths longer than 260 characters. The project therefore uses `expo-build-properties` to pin Android CMake 3.31.6, whose bundled Ninja supports long paths. Install the matching official SDK package if it is absent:

```powershell
sdkmanager "cmake;3.31.6"
```

Do not replace `ninja.exe` manually and do not disable the New Architecture; Expo SDK 55 and later require it. The configuration is enforced by `tests/config/app-config.test.ts`.

The Android SDK currently emits a non-blocking warning because a pre-existing `platform-tools.backup` directory duplicates the installed `platform-tools` package. It was preserved because its provenance is unknown; do not delete it as part of M01 without an explicit cleanup decision.

The Expo documentation recommends development builds for production projects and a real device for representative testing ([Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/)).

## 4. Connect a physical Android device

1. On the phone, enable Developer options and USB debugging.
2. Install the device manufacturer's Windows USB driver only if Windows does not identify the phone.
3. Connect with a data-capable cable, select file transfer if required, and accept the RSA fingerprint prompt on the phone.
4. Run:

```powershell
adb kill-server
adb start-server
adb devices -l
```

Expected: exactly the intended device appears with state `device`, not `unauthorized` or `offline`. Record model and Android/API version in the M01 issue. If USB Metro discovery fails later, use `adb reverse tcp:8081 tcp:8081`; do not expose Metro to an untrusted network.

## 5. Initialize and pin project tooling (M01 only)

Because this repository already contains bootstrap files and architecture docs, do not run a scaffold over it blindly. The M01 PR should create an SDK 58 scaffold in a temporary, explicitly checked directory, review its files, then merge only the intended app files into this repository.

Reference scaffold command:

```powershell
npx create-expo-app@5.0.0 do-well-sdk58 --template default@sdk-58
```

Expo Doctor prohibits `eas-cli` as a project dependency. Keep the CLI non-global and version-pinned by invoking its exact package version on demand; the Expo-supported development client remains pinned in the repository package:

```powershell
npx expo install expo-dev-client
npx expo --version
npx --yes eas-cli@25.3.0 --version
```

The pinned command reports `eas-cli/25.3.0`, while `eas.json#cli.version` requires the same release. Do not install EAS, Supabase, or Expo CLI globally. Add the Supabase CLI only when its milestone needs it. With EAS CLI kept out of project dependencies, Expo Doctor passes all checks.

After dependencies are present:

```powershell
npx expo install --check
npx expo-doctor
npx expo run:android
```

For compile-only proof when no device is attached, generate the ignored native project and run Gradle with JDK 17 selected:

```powershell
npx expo prebuild --platform android --clean --no-install
.\android\gradlew.bat -p android assembleDebug --no-daemon
```

On 2026-10-22 this produced `app-debug.apk` locally with Gradle reporting `BUILD SUCCESSFUL` after 702 tasks. Generated `android/` content and APKs remain ignored and must not be committed. Installation, launch, and screenshot proof still require the authorized physical device.

MapLibre, notifications, or other config-plugin changes require rebuilding the development client; Expo Go cannot load arbitrary native code ([MapLibre Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/), [Expo development build FAQ](https://docs.expo.dev/develop/development-builds/faq/)).

## 6. Local environment configuration

Copy `.env.example` to `.env.local` manually and replace placeholders with only:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Both are embedded in the APK and therefore public. RLS—not key secrecy—protects user data. Never put a Supabase secret/service-role key, database password, Google OAuth client secret, FCM service-account key, signing key, or AI credential in `EXPO_PUBLIC_*`, the app config, issue, log, screenshot, or Git.

Provider secrets belong in their provider dashboard or approved secret store. Supabase Edge Function local secrets belong in ignored `supabase/functions/.env`; the committed template contains names only. Do not edit or delete the preserved legacy credential files until the owner separately approves cleanup/rotation.

Before any commit:

```powershell
git check-ignore .env.local
git status --short
git diff --check
```

## 7. EAS and Supabase use

- Stay on Expo/EAS Free and Supabase Free; do not add a payment method.
- Use `npx expo run:android` for the guaranteed zero-external-cost local development compilation path. This is the default for ordinary development.
- `eas.json` defines only `development` and `preview` build profiles. Development enables the development client with internal distribution; preview uses internal distribution and Android APK output. There is no production build or submission profile.
- A cloud build is optional and may be invoked only after confirming the Expo account remains on Free and has sufficient included Android quota. If quota is unavailable, wait for reset and build locally; never upgrade or add billing.
- The optional cloud commands are `npx --yes eas-cli@25.3.0 build --platform android --profile development` and `npx --yes eas-cli@25.3.0 build --platform android --profile preview`. Neither was invoked while configuring M01.
- `eas login`, `eas init`, Supabase linking, OAuth dashboard changes, FCM credential upload, and signing-key generation are explicit milestone/manual actions because they mutate external state.
- Never pass tokens on a command line that will be logged. Use interactive login or a protected environment/secret store.

See `FREE_TIER_AND_COST_POLICY.md` for quotas and stop conditions.

## Readiness checklist

- [x] `node --version` is exactly the repository pin and satisfies Expo SDK 58.
- [x] `npm --version` is 10.9.9; add the matching `packageManager` field and lockfile in Task 2.
- [x] `java` and `javac` both report Temurin JDK 17 in the corrected M01 shell; remove/reorder the machine Java 8 shim before treating new-shell selection as durable.
- [x] Android Platform 37.0, Build-Tools 37.0.0, CMake 3.31.6, and platform-tools are installed.
- [x] `ANDROID_HOME` is correct and platform-tools is on the user PATH.
- [ ] The authorized physical device appears in `adb devices -l`.
- [x] `npx expo-doctor` passes all 20 checks.
- [x] A local debug APK compiles with JDK 17 and the pinned CMake/Ninja toolchain.
- [ ] A local development APK installs and launches on the named device.
- [ ] `.env.local` and credential files are ignored and no secret appears in Expo public config.
- [ ] No billing method or paid plan was enabled.
- [ ] Exact commands/results are attached to the M01 issue and PR.
