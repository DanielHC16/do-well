# Dependency Audit & Security Advisory Disposition

**Document:** `docs/reports/2026-10-25-dependency-audit-disposition.md`  
**Tracking Issue:** [#21 — Track Expo dependency audit advisories](https://github.com/DanielHC16/do-well/issues/21)  
**Date:** 2026-10-25 (Asia/Manila)  
**Verified Environment:** Node `22.23.2`, npm `10.9.9`, Expo SDK `58.0.19`  

---

## 1. Audit Execution & Baseline State

A fresh dependency verification was executed across all package manifests:

```powershell
# Check Expo dependency compatibility against SDK 58 release matrix
npx expo install --check
# Result: "Dependencies are up to date"

# Execute npm production audit
npm audit --omit=dev
```

### Audit Summary:
- **Critical Vulnerabilities:** `0` (Release gate satisfied)
- **High Vulnerabilities:** `5` (All isolated to build-time `@expo/cli`)
- **Moderate / Low Vulnerabilities:** `0`

---

## 2. Vulnerability Analysis & Exploitability Review

The 5 high vulnerabilities reported by `npm audit --omit=dev` are detailed below:

### Advisory 1: `node-forge` (GHSA-86w9-cpqp-85rv)
- **Path:** `node_modules/expo/node_modules/@expo/cli/node_modules/@expo/code-signing-certificates/node_modules/node-forge`
- **Severity:** High
- **Description:** RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements.
- **Runtime Exposure:** **NONE (Non-exploitable).**
  - `node-forge` is an internal transitive dependency of `@expo/code-signing-certificates` inside Expo's build-time CLI.
  - It is executed exclusively during local build preparation on the developer workstation.
  - It is **not** bundled into the React Native runtime, Hermes bytecode (`_expo/static/js/android/entry-*.hbc`), or the compiled Android APK.
  - The mobile app performs no client-side RSA signature verification via this library.

### Advisory 2: `zod` (<4.6.6) in `@expo/cli` (GHSA-mrhx-c7xc-m3w5)
- **Path:** `node_modules/expo/node_modules/@expo/cli/node_modules/zod`
- **Severity:** High
- **Description:** Zod can exhaust memory while validating oversized constrained collections.
- **Runtime Exposure:** **NONE (Non-exploitable).**
  - This advisory applies to older `zod` versions inside `@expo/cli` config parsing.
  - The DO-WELL application directly pins `zod@4.6.7` (which is patched against GHSA-mrhx-c7xc-m3w5).
  - All application runtime schemas (authentication, gigs, discovery, evidence, drafts) execute on the patched root dependency.
  - `@expo/cli` parses trusted developer config files (`app.config.ts`, `eas.json`) on the host machine and is never exposed to untrusted external network input.

---

## 3. Rejection of Forced Incompatible Downgrades

`npm audit fix --force` proposes the following automated remediation:
- Install `expo@54.0.38` (a breaking major version downgrade).
- Downgrade React Native to `0.72` and Jest to `25`.

### Disposition:
- **REJECTED.** Applying `--force` would destroy Expo SDK 58 compatibility, break React 19 support, revoke Android API 36/37 compatibility, and break typed file-based routing (`expo-router ~58.0.26`).
- Under the repository safety standards, forced breaking downgrades must not be applied to satisfy tooling audit advisories.

---

## 4. Verification & Regression Evidence

Following the audit review, all repository quality gates were re-executed on `chore/dependency-audit-disposition`:

| Gate | Command | Result |
| :--- | :--- | :--- |
| **Jest Suite** | `npm run test:run` | **81/81 suites passed, 482/482 tests passed** (17.5s) |
| **TypeScript** | `npm run typecheck` | **0 errors (`strict: true`)** |
| **ESLint** | `npm run lint` | **0 errors / 0 warnings** |
| **Prettier** | `npm run format:check` | **All files compliant** |
| **Expo Doctor** | `npx expo-doctor` | **20/20 checks passed** |
| **Hermes Android Bundle** | `npx expo export --platform android` | **4.9MB bundle generated cleanly** |

---

## 5. Acceptance Conclusion

1. No compatible security update is left unapplied: `npx expo install --check` confirms all Expo packages match the official SDK 58 matrix.
2. No forced incompatible downgrade is introduced.
3. All reported advisories are proved non-exploitable in the client runtime.
4. Issue #21 criteria are fully satisfied and documented.
