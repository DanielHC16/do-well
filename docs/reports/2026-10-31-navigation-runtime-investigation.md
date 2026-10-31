# Navigation queue investigation — 2026-10-31

## Result and scope

The running emulator was recovered with a cold process restart and reconnection to the existing Metro server. Fresh-process ReactNativeJS logs contain **zero imperative routing queue warnings and zero duplicate-linking warnings**. No application navigation defect was found. No app source, dependencies, environment, credentials, backend, native files, or navigation configuration were changed; nested Stacks remain intact.

This is runtime recovery, **not a permanent framework patch**. The warning can recur when Android font-scale/density changes recreate the Activity in the current development runtime. A durable fix to that lifecycle race remains outside this investigation's no-native-change boundary. Do not represent it as fixed by removing an application navigator or hiding LogBox warnings.

## Inspected structure

- `package.json#main` is the standard `expo-router/entry`; there is no custom application registration.
- `app/_layout.tsx` renders `RootRuntime` and one root Stack. Public/onboarding/protected/demo layouts contain valid nested Stacks and their existing auth/runtime guards.
- `RootRuntime` supplies existing providers inside the router tree. It does not render an ExpoRoot or NavigationContainer.
- Application source contains no manual NavigationContainer, duplicate ExpoRoot, AppRegistry registration, or second React root construction.
- The installed dependency graph contains one deduplicated Expo Router 58.0.26, React 19.3.0, and React Native 0.88.0. The installed Android activity already uses singleTask.
- Recent icon/layout changes do not create router roots. Correct nested navigators are not independent navigation containers.

## Reproduction and actual cause

1. Stop the Do Well process, open the existing Development Build/project, and inspect logs for the new PID: queue warnings **0**, linking warnings **0**.
2. Without navigating or authenticating, change emulator system font scale from 1.0 to 1.1. Android recreates its Activity while retaining the JavaScript runtime. A duplicate-linking warning appears.
3. Restore font scale to 1.0. The same process logs **1 queue warning and 2 linking warnings**. This reproduces the user's error without a frontend navigation action.
4. Cold-stop/reopen the process against the same Metro server. Both warning counts return to **0**. Emulator settings are restored to font scale 1.0 and physical density 420.

Installed source explains the race:

- `expo-router/build/global-state/routingQueueContext.js` maintains module-global `boundBridges`. Mounting a second `ImperativeRoutingQueueBridge` before cleanup of the first emits this exact development warning.
- `ExpoRoot` creates the container; `react-navigation/core/BaseNavigationContainer.js` mounts the bridge. An ordinary nested Stack does not create this bridge.
- Expo's `ReactActivityDelegateWrapper` runs destruction work asynchronously. React Native `ReactDelegate.onHostDestroy()` calls `unloadApp()`; Fabric calls `reactSurface.stop()` without awaiting final JS cleanup.
- `ReactHostImpl` schedules surface stop, and Fabric's renderer eventually queues a concurrent `updateContainer(null, ...)`. A replacement Activity can mount its root before the prior root's router/linking effects clean up.

The evidence supports overlapping development-runtime surfaces during Activity recreation. A custom entry-point ownership gate would not repair native surface destruction and risks the existing OAuth/deep-link lifecycle. The installed Fabric `AppRegistry.unmountApplicationComponentAtRootTag` path explicitly rejects that legacy operation. Neither workaround was introduced. Dependency warning suppression and edits under node_modules were also avoided.

## Recovery and verification on the emulator

Keep the existing Metro server running. In PowerShell:

```powershell
$doWellAdb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $doWellAdb -s emulator-5554 shell am force-stop com.anghulingpullrequest.dowell
& $doWellAdb -s emulator-5554 reverse tcp:8081 tcp:8081
& $doWellAdb -s emulator-5554 shell am start -a android.intent.action.VIEW -d 'dowell://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' -p com.anghulingpullrequest.dowell
```

This restarts the process only. It does not clear app data, sessions, credentials, caches, Metro state, or native files. No prebuild or rebuild is needed for recovery. Wait for the existing authentication screen to load, then inspect **only the new process's logs**, so old buffered errors do not look like a fresh failure:

```powershell
$doWellPid = (& $doWellAdb -s emulator-5554 shell pidof com.anghulingpullrequest.dowell).Trim()
$doWellLogs = & $doWellAdb -s emulator-5554 logcat -d --pid=$doWellPid -v brief -s ReactNativeJS
@($doWellLogs | Select-String 'multiple navigation containers consuming|configured linking in multiple').Count
# Expected: 0
```

Verify Sign In/Create Account, the introduction, and normal route/deep-link handling before signing in. A `dowell://worker` intent was delivered to the already-running activity during this investigation to exercise the existing protected-route path without submitting credentials. Do not use another font/density change as proof of a permanent fix: it is the known framework recreation trigger. After small/large-font testing, cold-restart the development process before judging ordinary navigation.

For a durable framework fix, separately investigate a verified Expo/React Native lifecycle correction and its Android development-build acceptance. No version upgrade or native change was made or authorized here.

## Checks and changed files

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- Root runtime, protected route guards, and protected route components: **3 Jest suites / 23 tests passed**.
- `npm.cmd run format:check` and `git diff --check`: passed.
- Recovery screenshot: ignored `.codex-artifacts/navigation-recovered.png`; diagnostic helpers are ignored and not app imports.
- Durable changes are this report, `docs/SESSION_HANDOFF.md`, and `docs/IMPLEMENTATION_ROADMAP.md`. No commit, push, or merge occurred.
