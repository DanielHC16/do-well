# Do Well

Do Well is an Android productivity application for the UMAK IT Skills Olympics 2026. It connects people offering legitimate short-term paid gigs with nearby or remote workers and follows work from a clear brief through application, assignment, submission, and completion.

## Status

Phase 3 architecture is approved and merged. M01 has initialized the Expo SDK 58 application, added an accessible setup smoke screen, and proven a local Android debug APK build. Physical-device installation and launch evidence are still pending, so M01 remains in progress and no product feature is represented as implemented.

Confirmed foundations:

- React Native and TypeScript with Expo development builds and Expo Router
- Supabase Auth, PostgreSQL, Row Level Security, private Storage, and Edge Functions where justified
- One account with worker and employer modes; one worker per gig in the MVP
- Human-reviewed AI job briefs, explainable matching, and manual fallbacks
- A hard external-service spending limit of PHP 0 / USD 0

## Repository safety

Only `.env.example` is version-controlled. Local environment files, OAuth client downloads, cloud credentials, signing material, and generated native/build output are ignored. Never place privileged credentials in an `EXPO_PUBLIC_*` variable.

## Getting started

Prerequisites: Node `22.23.2`, npm `10.9.9`, JDK 17, Android SDK Platform 37/Build-Tools 37, CMake `3.31.6`, and an authorized Android device.

```powershell
nvm use 22.23.2
npm ci
npm run test:run
npm run lint
npm run android
```

The Android command generates ignored native files, builds the development client locally, and installs it on the connected device. See [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) for the Windows toolchain, device authorization, and verification details.

## Documentation

The durable product, architecture, security, setup, workflow, roadmap, and session-handoff documentation lives in [`docs/`](docs/README.md). Start with:

1. [`docs/README.md`](docs/README.md) for the document map and recovery order.
2. [`docs/SESSION_HANDOFF.md`](docs/SESSION_HANDOFF.md) for verified current state.
3. [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md) for M00-M14 dependencies and acceptance criteria.

M01 work is on `chore/expo-initialization`. Do not start M02 until M01 has physical-device install/launch evidence and the M01 PR is approved and merged.
