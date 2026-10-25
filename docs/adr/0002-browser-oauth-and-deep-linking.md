# ADR 0002: Browser OAuth and deep linking

- Status: Accepted
- Date: 2026-10-21

## Context

The app requires Google OAuth and email/password authentication on Android. The downloaded Google OAuth JSON contains a Web client secret and must never ship in the app. OAuth must restore an app session after the system browser returns, including cancel, timeout, and expired-link cases.

## Decision

Use Supabase hosted browser OAuth. Google redirects to the Supabase HTTPS callback; Supabase then redirects to the allow-listed application URL `dowell://auth/callback`. The Android package identifier is `com.anghulingpullrequest.dowell`. The app opens OAuth with Expo WebBrowser/Linking, validates the callback path and parameters, exchanges the returned code through the installed Supabase SDK API verified during M03, persists the resulting session in the SDK-supported React Native storage adapter, and resumes onboarding or the authenticated route.

Configure the Google Web client ID and secret only in the Supabase Auth provider dashboard. Store no OAuth secret in Expo configuration or `EXPO_PUBLIC_*`. Email/password remains an independent supported path. A database trigger creates the minimal profile row for each `auth.users` record; onboarding completes editable public fields and worker preferences.

## Alternatives considered

- Native Google Sign-In SDK: deferred because hosted browser OAuth meets MVP needs without Android OAuth SHA-1 configuration for authentication.
- Embedded web view: rejected because it is less secure and commonly disallowed by identity providers.
- Client-side profile creation only: rejected because interrupted onboarding can leave inconsistent application state.

## Consequences

- A custom-scheme callback is easy to demonstrate but not globally exclusive. Validate callback contents and use OAuth state/PKCE protections provided by the verified SDK flow.
- Supabase redirect allowlists and Google authorized redirect URIs are required external configuration.
- Session secrets use secure, SDK-compatible device persistence and are never logged.
- A future verified universal/app-link migration can improve callback ownership without changing the hosted-provider boundary.

## Validation gates

- Physical-device tests cover Google success/cancel/error, email sign-up/sign-in, cold-start callback, session refresh, logout, expired session, and interrupted onboarding.
- A repository scan confirms the Google client secret and privileged Supabase key are absent from tracked files and build configuration.
