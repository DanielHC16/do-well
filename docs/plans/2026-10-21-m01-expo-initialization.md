# M01 Expo Initialization Implementation Plan

> **For Claude:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Produce a pinned Expo SDK 58 Android development shell that builds, installs, launches, and passes the repository quality gates without implementing product features.

**Architecture:** Keep the Expo application at the repository root using Continuous Native Generation and Expo Router. Establish only configuration, a neutral smoke screen, test/tooling infrastructure, and a verified physical-device build. Preserve all Phase 3 documents and local secrets.

**Tech Stack:** Node.js 22.23.2, npm 10.9.9 pinned through `packageManager`, Expo SDK 58, React Native 0.88, React 19.3, TypeScript strict, Expo Router, Jest 30 with `jest-expo`, React Native Testing Library 14+, ESLint, Prettier, on-demand pinned EAS CLI 25.3.0, JDK 17, Android SDK 37.

---

## Preconditions

- M00 documentation PR is approved and merged; start from updated `main`.
- Issue M01 is open and assigned; create branch `chore/expo-initialization`.
- No application dependency or generated native directory exists on the branch.
- `.env.local` and the downloaded OAuth JSON remain ignored. Never read their values during this milestone.
- The project owner has approved Expo SDK 58 and any required local machine configuration change.

## Task 1: Revalidate and correct the Android toolchain

**Files:**

- Modify: `docs/SETUP_GUIDE.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Create: `.nvmrc`

1. Run the preflight and save only versions/paths, never environment values:

   ```powershell
   node --version
   npm --version
   java -version
   javac -version
   git --version
   gh --version
   Get-Command adb -ErrorAction SilentlyContinue
   adb devices -l
   ```

   Expected before correction: Node 22.12 is below Expo 58's 22.13 minimum; `java` may resolve to Java 8 while `javac`/`JAVA_HOME` resolve to JDK 17; no phone may be listed.

2. Install and select Node 22.23.2 with the team's existing nvm-windows installation; this matches the current Expo SDK 58 Android build image. Do not install a second global Expo CLI.

3. Set `JAVA_HOME` and the user PATH to the verified JDK 17 directory. Add the verified Android SDK `platform-tools` path and set `ANDROID_HOME` to the SDK root. Do not guess any path; resolve it from Android Studio/SDK Manager first.

4. Install Android SDK Platform 37 and the matching build tools through Android Studio SDK Manager. Accept only official Android licenses.

5. Connect the intended phone, enable USB debugging, accept its fingerprint, and rerun `adb devices -l`.

6. Add `.nvmrc` containing the exact working Node 22.x version and update the setup/handoff documents with non-secret, machine-independent instructions.

7. Commit only after the preflight matches the expected versions:

   ```text
   chore(setup): pin supported Node and Android toolchain
   ```

## Task 2: Generate and review the Expo SDK 58 scaffold

**Files:**

- Create/modify after review: `package.json`, `package-lock.json`, `app.json` or `app.config.ts`, `expo-env.d.ts`, `tsconfig.json`, `eslint.config.js`, `app/**`, `assets/**`
- Do not create tracked: `android/**`, `ios/**`, `.env*` except `.env.example`

1. Generate the official SDK 58 default template in a dedicated temporary directory outside the Git worktree:

   ```powershell
   $m01Scaffold = Join-Path ([System.IO.Path]::GetTempPath()) 'do-well-m01-expo-scaffold'
   Resolve-Path (Split-Path $m01Scaffold -Parent)
   npx create-expo-app@5.0.0 $m01Scaffold --template default@sdk-58
   ```

   Expected: the generated `package.json` targets Expo 58 and includes Expo Router. If the target already exists, stop and choose a new explicit temporary directory; never recursively delete an unresolved path.

2. Inspect generated `package.json`, app configuration, lockfile, and directory tree. Record the exact resolved dependency versions; do not hand-invent package versions.

3. Reproduce the reviewed scaffold at repository root while preserving `AGENTS.md`, `.github/`, `.gitignore`, `README.md`, and `docs/`. Use patches for text files and copy only reviewed generated binary assets. Do not copy the scaffold's Git metadata or overwrite repository documents.

4. Set:

   - app name: `Do Well`
   - slug: `do-well`
   - scheme: `dowell`
   - Android package: `com.anghulingpullrequest.dowell`
   Expo SDK 58 requires the New Architecture; do not add the removed/ignored `newArchEnabled` option. Verify every selected native dependency declares compatible SDK 58/New Architecture support.

5. Add `"packageManager": "npm@10.9.9"`. Keep `package-lock.json` as the only lockfile.

6. Remove template demonstration routes/assets that do not support the neutral smoke screen. This is scaffold cleanup, not product implementation.

7. Verify:

   ```powershell
   npm ci
   npx expo-doctor
   npm run typecheck
   git status --short
   ```

   Expected: installation is reproducible, Expo Doctor reports no blocking issue, typecheck succeeds, and no generated native directory or secret file is tracked.

8. Commit:

   ```text
   chore(setup): initialize Expo SDK 58 project
   ```

## Task 3: Add a failing configuration contract test

**Files:**

- Create: `tests/config/app-config.test.ts`
- Create/modify: `jest.config.js` or the scaffold's supported Jest configuration, `package.json`, `tsconfig.json`
- Modify: `app.config.ts` if the scaffold used `app.json`

1. Install the Expo-supported SDK 58 testing stack through Expo's package resolver, then pin the resolved versions in the lockfile:

   ```powershell
   npx expo install jest-expo jest @types/jest @testing-library/react-native "--" --dev
   npm install --save-dev prettier@3.9.10
   ```

   Expo SDK 58 requires Jest 30, and Expo Router requires React Native Testing Library 14+. Do not install deprecated `react-test-renderer` or create a second Vitest runner. If peer dependency resolution fails, stop and investigate the resolved scaffold versions; do not force-install.

2. Add scripts: `format`, `format:check`, `lint`, `typecheck`, `test`, and `test:run`. Configure Jest with the `jest-expo` preset and add `jest` types to TypeScript exactly as documented for Expo SDK 58. The repository-specific `AGENTS.md` records this React Native exception to the inherited Vitest preference.

3. Write a test that imports the app configuration and asserts the name, scheme, Android package, and absence of secret-shaped configuration fields.

4. Run the single test before completing `app.config.ts`:

   ```powershell
   npm run test:run -- tests/config/app-config.test.ts
   ```

   Expected: FAIL for missing/wrong exported configuration.

5. Implement the minimum typed `app.config.ts` needed to pass. Keep public environment variables out of config unless required at build time; never embed a secret.

6. Rerun the test and all static checks. Expected: PASS.

7. Commit:

   ```text
   test(setup): enforce Expo application configuration
   ```

## Task 4: Build the neutral smoke route test-first

**Files:**

- Create: `app/_layout.tsx`
- Create: `app/index.tsx`
- Create: `src/features/setup/SetupSmokeScreen.tsx`
- Create: `src/features/setup/__tests__/SetupSmokeScreen.test.tsx`
- Create/modify: test setup file selected by the Jest configuration

1. Write a behavior test requiring a visible `Do Well` title and `Development setup ready` status. The screen must use semantic accessibility roles and contain no marketplace feature behavior.

2. Run the test. Expected: FAIL because the component does not exist.

3. Implement only the minimum screen and router layout.

4. Run:

   ```powershell
   npm run test:run
   npm run lint
   npm run typecheck
   npm run format:check
   ```

   Expected: all pass.

5. Commit:

   ```text
   chore(setup): add Android smoke screen
   ```

## Task 5: Add cost-safe development and preview build profiles

**Files:**

- Create: `eas.json`
- Modify: `package.json`
- Modify: `docs/SETUP_GUIDE.md`
- Modify: `docs/FREE_TIER_AND_COST_POLICY.md`

1. Before creating any hosted workflow, have the owner verify that the GitHub account has no valid payment method or has an enforced zero-dollar Actions budget with **Stop usage when budget limit is reached**. Record evidence without billing details. If this cannot be verified, do not add a hosted workflow; keep local checks authoritative and mark CI cost-blocked in the issue.

2. Invoke the exact EAS CLI release with `npx --yes eas-cli@25.3.0`; do not install it globally or as a project dependency, which current Expo Doctor rejects. Configure `development` with `developmentClient: true` and `preview` with internal distribution/APK output. Keep production submission out of scope.

3. Document two paths:

   - guaranteed zero-cost local development compilation: `npx expo run:android`
   - optional EAS Free cloud build, available only while the account is on Free and quota remains

4. Add a test or JSON-schema validation script that fails for a missing development client or non-APK preview profile, then make `eas.json` pass it.

5. Do not add a payment method. If the Free account is unavailable or quota is exhausted, use the local path; do not upgrade.

6. Commit:

   ```text
   chore(android): configure zero-cost development builds
   ```

## Task 6: Prove the Android build on the physical device

**Files:**

- Generated but ignored: `android/**`
- Modify: `docs/SETUP_GUIDE.md`
- Modify: `docs/SESSION_HANDOFF.md`

1. Confirm a clean logical worktree and an authorized device:

   ```powershell
   adb devices -l
   npx expo-doctor
   ```

2. Generate and compile locally:

   ```powershell
   npx expo run:android --device
   ```

   Expected: the development build installs, launches, and displays the smoke status. Generated `android/` remains ignored under the CNG decision.

3. Disconnect Metro, reconnect, rotate/relaunch, and record observed behavior. Capture a screenshot for the pull request without personal notifications or device identifiers.

4. Optionally consume one EAS Free Android build only after confirming Free status and remaining quota. A cloud build is not required for M01 acceptance if the local physical-device build passes.

5. Rerun the complete verification suite:

   ```powershell
   npm run format:check
   npm run lint
   npm run typecheck
   npm run test:run
   npx expo-doctor
   git status --short
   git check-ignore -v .env.local client_secret_399907094692-4nrimvl8cd0qkppkg34o56khed88ja8m.apps.googleusercontent.com.json android
   ```

6. Update the handoff with actual outputs, device/build proof, limitations, and M02 as the exact next task.

7. Commit:

   ```text
   docs(setup): record verified Android development build
   ```

## Task 7: Review and open the milestone pull request

1. Review `git diff main...HEAD`, the explicit staged list, lockfile changes, and package scripts.

2. Run count-only secret-pattern scans against tracked/staged content. Never scan local credential files in a way that prints their contents.

3. Ask the reviewer agent for a read-only review against M01 acceptance criteria. Resolve all high/medium findings and document accepted residual risks.

4. Push `chore/expo-initialization` and open one PR that closes the M01 issue. Include validation output, physical-device screenshot, security review, cost review, limitations, and M02 next steps.

5. Do not merge. Update `docs/SESSION_HANDOFF.md` with the issue/PR numbers and current branch.

## M01 Definition of Done

- Expo SDK 58/React Native 0.88 dependencies and npm are pinned in committed files.
- Node is 22.23.2 with npm 10.9.9, Java/Javac use JDK 17, Android Platform 37 is installed, and an authorized physical device is visible to ADB.
- Format, lint, strict typecheck, Jest tests, and Expo Doctor pass locally. Hosted CI is required only after its zero-cost billing guard is verified; otherwise the issue and PR state that it remains cost-blocked.
- A local Android development build installs and launches the neutral smoke route on the target phone.
- CNG native directories and all credential files remain ignored; tracked/staged scans find no secrets.
- No product feature, Supabase resource, billing method, or paid service was created.
- The M01 issue, PR, reviewer result, setup guide, roadmap state, and session handoff agree.
- The PR remains open for project-owner approval.
