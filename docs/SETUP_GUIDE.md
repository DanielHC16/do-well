# Windows Development Setup Guide

## Status and target

This is the setup plan for M01; it does not claim the app has been initialized. No software installation or environment mutation was performed while writing this guide.

Target baseline, verified on 2026-10-21:

- Windows PowerShell
- Node.js `22.23.2` pinned in `.nvmrc`
- npm `10.9.9` pinned in `package.json#packageManager`
- Expo SDK `58` / React Native `0.88`
- JDK 17
- Android SDK Platform 37, Build-Tools 37.0.0, target SDK 36, Android platform-tools/ADB
- project-local/pinned `eas-cli@25.3.0` and `supabase@2.121.0`

Expo SDK 58 requires Node 22.13.x or newer and uses Android compile SDK 37/target SDK 36 ([Expo SDK reference](https://docs.expo.dev/versions/v58.0.0/)); the SDK 58 build-properties reference uses Build-Tools 37.0.0 ([Expo BuildProperties](https://docs.expo.dev/versions/latest/sdk/build-properties/)). Expo's SDK 58 Android build image uses Java 17 and Node 22.23.2, which is why this plan pins those versions ([EAS build infrastructure](https://docs.expo.dev/build-reference/infrastructure/)). The SDK 58 template is explicitly selected because the default scaffold may remain on SDK 57 during the transition ([create an Expo project](https://docs.expo.dev/get-started/create-a-project/)).

## Current machine findings

| Check | Current state | Required action before M01 |
|---|---|---|
| Node | `22.12.0` via nvm-windows 1.2.2 | Install/use pinned 22.23.2; current version is below Expo 58 minimum |
| npm | `10.9.0` | Use/pin 10.9.9 with the selected Node installation |
| pnpm | `12.8.1` | Not selected; do not create a second lockfile |
| `java` | Oracle Java 8 first on PATH | Put JDK 17 `bin` before the Java 8 shim or remove that shim from the user/system PATH |
| `javac` / `JAVA_HOME` | Eclipse Adoptium 17.0.10 | Keep as the Java 17 home |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk`; platforms 29/31/33/34/35 | Install Platform 37 and current compatible Build Tools |
| ADB | File exists under `platform-tools`, not on PATH | Add `%ANDROID_HOME%\platform-tools` to user PATH |
| `ANDROID_HOME` | Unset | Set to `%LOCALAPPDATA%\Android\Sdk` |
| Expo app/lockfile | Absent | Initialize only after architecture approval |
| Legacy global Expo CLI | Previously detected | Do not use it; use project-local `npx expo` |
| EAS/Supabase CLI | Not project-pinned | Add exact dev dependencies during M01 |

## 1. Select Node and npm

Run only after M01 is approved:

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

The machine already has JDK 17 at the `JAVA_HOME` location, but `java.exe` currently resolves through the Oracle Java 8 shim. In **System Properties > Environment Variables**:

1. keep/set user `JAVA_HOME` to the installed JDK 17 directory;
2. add `%JAVA_HOME%\bin` near the top of the user PATH;
3. move/remove `C:\Program Files (x86)\Common Files\Oracle\Java\java8path` from ahead of it;
4. open a new PowerShell window.

Do not rewrite the full PATH with `setx`; it can lose or truncate entries. Verify:

```powershell
where.exe java
java -version
javac -version
```

Both compiler and runtime must report Java 17 from the same JDK family/path before Gradle is run.

## 3. Configure Android SDK and ADB

In **Android Studio > SDK Manager** install/check:

- Android SDK Platform 37;
- Android SDK Platform 36 (target compatibility/tools as needed);
- Android SDK Build-Tools 37.0.0;
- Android SDK Platform-Tools;
- Android SDK Command-line Tools (latest);
- one emulator image only if emulator testing is desired.

Set user `ANDROID_HOME` to:

```text
%LOCALAPPDATA%\Android\Sdk
```

Add these existing directories to the user PATH:

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

Then pin project-local operational CLIs in the repository package:

```powershell
npm install --save-dev eas-cli@25.3.0 supabase@2.121.0
npx expo --version
npx eas --version
npx supabase --version
```

The versions above were read from the npm registry on 2026-10-21. The M01 PR must verify them against official release notes, commit the lockfile, and update the pins through reviewed dependency PRs only. Do not install EAS, Supabase, or Expo CLI globally.

After dependencies are present:

```powershell
npx expo install --check
npx expo-doctor
npx expo run:android
```

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
- Use local `npx expo run:android` for ordinary development builds.
- Use the limited EAS Android queue only for approved shared/release builds.
- `eas login`, `eas init`, Supabase linking, OAuth dashboard changes, FCM credential upload, and signing-key generation are explicit milestone/manual actions because they mutate external state.
- Never pass tokens on a command line that will be logged. Use interactive login or a protected environment/secret store.

See `FREE_TIER_AND_COST_POLICY.md` for quotas and stop conditions.

## Readiness checklist

- [ ] `node --version` is exactly the repository pin and satisfies Expo SDK 58.
- [ ] `npm --version` matches `packageManager`; only `package-lock.json` exists.
- [ ] `java` and `javac` both resolve to JDK 17.
- [ ] Android Platform 37 and platform-tools are installed.
- [ ] `ANDROID_HOME` is correct and `adb` is on PATH.
- [ ] The authorized physical device appears in `adb devices -l`.
- [ ] `npx expo-doctor` passes or every warning is documented.
- [ ] A local development APK installs and launches on the named device.
- [ ] `.env.local` and credential files are ignored and no secret appears in Expo public config.
- [ ] No billing method or paid plan was enabled.
- [ ] Exact commands/results are attached to the M01 issue and PR.
