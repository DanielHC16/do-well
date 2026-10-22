# Do Well

Do Well is an Android productivity application for the UMAK IT Skills Olympics 2026. It connects people offering legitimate short-term paid gigs with nearby or remote workers and follows work from a clear brief through application, assignment, submission, and completion.

## Status

Phase 3 architecture and M01 are approved and merged. M01 initialized the Expo SDK 58 application, added an accessible setup smoke screen, and proved local Android debug builds on both an Android emulator and an authorized physical phone. No product feature is represented as implemented.

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

## Run the Android development build

`npm run android` starts Metro, builds the debug development client, installs it, and launches it. If an emulator and phone are connected at the same time, first run `adb devices -l`, then pass the intended adb serial to Expo with `--device`; use that same serial with every `adb -s` command.

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

M01 was merged in [PR #17](https://github.com/DanielHC16/do-well/pull/17), and its physical-device evidence is recorded in the repository. M02 is the next implementation milestone.
