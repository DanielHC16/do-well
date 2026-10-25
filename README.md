# Do Well

Do Well is an Android productivity application for the UMAK IT Skills Olympics 2026. It connects people offering legitimate short-term paid gigs with nearby or remote workers and follows work from a clear brief through application, assignment, submission, and completion.

## Status

Phase 3 architecture, the Expo/Android foundation, database/RLS foundation, and M03A authentication foundation are merged. D01 now prioritizes a functional offline Demo Preview of the core marketplace lifecycle while hosted authentication acceptance remains deferred as M03B.

Confirmed foundations:

- React Native and TypeScript with Expo development builds and Expo Router
- Supabase Auth, PostgreSQL, Row Level Security, private Storage, and Edge Functions where justified
- One account with worker and employer modes; one worker per gig in the MVP
- Human-reviewed AI job briefs, explainable matching, and manual fallbacks
- A hard external-service spending limit of PHP 0 / USD 0

## Repository safety

Only `.env.example` is version-controlled. Local environment files, OAuth client downloads, cloud credentials, signing material, and generated native/build output are ignored. Never place privileged credentials in an `EXPO_PUBLIC_*` variable.

## Getting started

Prerequisites: Node `22.23.2`, npm `10.9.9`, JDK 17, Android SDK Platform 37/Build-Tools 37, CMake `3.31.6`, and either an existing Android Virtual Device (AVD) or an authorized USB-connected Android phone.

```powershell
nvm use 22.23.2
npm ci
npm run test:run
npm run lint
npm run android
```

The Android command generates ignored native files, builds the development client locally, and installs it on the connected device. See [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) for the Windows toolchain, device authorization, and verification details.

## Run the local database

Prerequisite: Docker Desktop must be installed and running. The repository pins Supabase CLI `2.121.0`; use the npm scripts rather than a global CLI. The stack is isolated to ports `55320`-`55329` plus Edge Runtime inspector port `5583`.

```powershell
npm run db:start
npm run db:reset
npm run db:test
npm run db:lint
npm run db:types:check
```

Use `npm run db:types` only when intentionally regenerating `src/types/database.generated.ts`, and stop the stack with `npm run db:stop`. The reviewed migration chain is also applied to the authorized hosted project. Future hosted changes still require a migration-list/dump/dry-run review; never include seed data unless explicitly approved. Do not enable billing or add a payment method.

Run `npm run db:test:performance` separately when validating the 10,000-gig/50,000-application query plans; the normal database suite stays focused and fast.

`.env.local` remains ignored and must use valid dotenv syntax (`NAME=value`, one assignment per line, with no PowerShell statements). Only client-safe `EXPO_PUBLIC_*` values may be exposed to the app.

## Run the Android development build

`npm run android` starts Metro, builds the debug development client, installs it, and launches it. If an emulator and phone are connected at the same time, first run `adb devices -l`, then pass the intended adb serial to Expo with `--device`; use that same serial with every `adb -s` command.

### Offline Demo Preview

The demo runtime uses fictional personas and local sample data, so it needs no account, network, Docker, or Supabase configuration. It demonstrates the UI and local state transitions only—not real authentication, cloud sync, RLS enforcement, uploads, payments, GPS, identity verification, or AI inference.

```powershell
nvm use 22.23.2
$env:EXPO_PUBLIC_APP_RUNTIME="demo"
npm run android -- --device emulator-5554
```

Follow the numbered progress card: create a gig as Maya (Employer), switch to Alex (Worker) to apply, switch back to select him, submit as Alex, then approve as Maya. The state persists locally across restarts; **Reset demo** restores the deterministic sample scenario.

Before testing production authentication, remove the session variable and restart Metro so production remains the default:

```powershell
Remove-Item Env:EXPO_PUBLIC_APP_RUNTIME -ErrorAction SilentlyContinue
npm run android -- --device emulator-5554
```

### Existing emulator/AVD

Start the AVD from Android Studio's Device Manager, wait for Android to finish booting, then run:

```powershell
adb devices -l
$device = "emulator-5554" # Replace with the listed emulator serial.
npm run android -- --device $device
```

### USB-connected physical device

Enable Developer options and USB debugging on the phone, connect it with a data-capable cable, unlock it, and accept the RSA authorization prompt. `adb devices -l` must show the phone as `device`; if it says `unauthorized`, accept the prompt and run the command again.

```powershell
adb devices -l
$device = "YOUR_PHONE_SERIAL" # Replace with the listed physical-device serial.
adb -s $device reverse tcp:8081 tcp:8081
npm run android -- --device $device
```

The reverse rule lets the USB device reach Metro on the Windows host. Reapply it after reconnecting the phone or restarting adb.

### Install the existing debug APK

If `android\app\build\outputs\apk\debug\app-debug.apk` already exists, install it without rebuilding, point the selected target at Metro, and start Metro in development-client/localhost mode:

```powershell
$device = "YOUR_ADB_SERIAL"
adb -s $device install -r .\android\app\build\outputs\apk\debug\app-debug.apk
adb -s $device reverse tcp:8081 tcp:8081
npm run start -- --dev-client --localhost
```

Open **Do Well** on the selected target. If the Expo development launcher appears first, select the local **Do Well** server. A successful smoke launch shows **Do Well** and **Development setup ready**. The APK is generated and ignored; a clean clone must build it with `npm run android -- --device $device` first.

## Documentation

The durable product, architecture, security, setup, workflow, roadmap, and session-handoff documentation lives in [`docs/`](docs/README.md). Start with:

1. [`docs/README.md`](docs/README.md) for the document map and recovery order.
2. [`docs/SESSION_HANDOFF.md`](docs/SESSION_HANDOFF.md) for verified current state.
3. [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md) for M00-M14 dependencies and acceptance criteria.

M01 was merged in [PR #17](https://github.com/DanielHC16/do-well/pull/17), and its physical-device evidence is recorded in the repository. M02 was merged in [PR #19](https://github.com/DanielHC16/do-well/pull/19) with its local database and security verification evidence.
