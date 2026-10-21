# Free-Tier and Cost Policy

## Non-negotiable gate

Do Well's total external-service spend is **PHP 0 / USD 0**. No teammate or agent may:

- add a payment card or billing account;
- activate a paid plan, trial that converts to paid, paid add-on, or automatic overage;
- rely on promotional credits;
- enable Google Maps Platform or another billing-dependent map API;
- provision a paid AI API or hosted model;
- merge a dependency on a service whose current zero-cost limits and failure behavior are undocumented.

A feature stops at the gate if it cannot be delivered under these rules. The acceptable response is a free alternative, a reduced scope, or a clearly documented blocker—not a silent paid substitution.

## Service review gate

Before adding or materially changing an external service, the PR must record:

1. official pricing/terms link and review date;
2. required plan and whether a card/billing link is required;
3. every relevant quota, reset period, hard-stop behavior, and inactivity rule;
4. proof that overage is impossible or account spending is fixed at zero;
5. data sent, retention, secrets, and account owner;
6. degraded/offline behavior when the quota or service is unavailable;
7. an exit/export path;
8. a policy re-check owner and date before the competition.

Free-tier terms change. Values below were verified from first-party sources on **2026-10-21** and must be rechecked before enabling the service and again before the competition build.

## Approved and conditional services

| Service | Verified zero-cost position | Guardrail | Status |
|---|---|---|---|
| Supabase Free | Two active free projects; 50,000 MAU, 500 MB database, 1 GB file storage, 5 GB uncached plus 5 GB cached egress, 500,000 Edge Function invocations, 2 million Realtime messages, 200 peak Realtime connections | No plan upgrade/add-on; monitor at 50/75/90%; keep migrations/exports | **Approved within limits** |
| Expo/EAS Free | Up to 15 Android and 15 iOS builds monthly, low-priority queue, 45-minute build timeout, 60 workflow minutes, EAS Update to 1,000 MAU | No paid plan/card; conserve cloud builds; local Android build is primary | **Approved within limits** |
| Expo Push Service | No sending fee; 600 notifications/second/project | FCM credentials still required on Android; remote push is optional | **Conditional** |
| Firebase Cloud Messaging | FCM is a no-cost product on Spark and Spark needs no payment information | Do not enable Blaze, Cloud Functions, paid Google Cloud APIs, or billing | **Conditional** |
| GitHub Free/private repo | Unlimited private repositories; personal Free includes 2,000 Actions minutes/month and 500 MB shared Actions artifact/package storage | Hosted Actions remains disabled until the owner verifies no valid payment method or an enforced zero-dollar stop-usage budget; then use standard Ubuntu runners only and short artifact retention | **Repository approved; hosted Actions conditional** |
| MapLibre React Native | MIT-licensed renderer; no renderer API key | Tile/style/data source needs a separate approval | **Conditional renderer only** |
| OpenStreetMap data | ODbL data with attribution/share-alike obligations | Does not include unrestricted production tile hosting | **Approved data source with license compliance** |
| Public OSM raster tiles | Donation-funded, best effort, no SLA; may block clients; no bulk download or offline packs | Not a release dependency; policy-compliant feasibility use only | **Not approved as default hosting** |
| Local AI inference | Software/model may be free, but hardware, license, latency, and network architecture must pass M10 benchmark | No AI claim until real inference is demonstrated | **Feasibility only** |
| Paid/billing-enabled maps or AI | May charge or require billing | None | **Prohibited** |

Supabase publishes the current Free quotas in its [billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase) and [pricing table](https://supabase.com/pricing). Free projects enter read-only behavior above the 500 MB database quota ([database size behavior](https://supabase.com/docs/guides/platform/database-size)). Egress is shared across database, Auth, Storage, Functions, and Realtime; cached and uncached quotas are separate ([egress documentation](https://supabase.com/docs/guides/platform/manage-your-usage/egress)).

Expo lists the current Free allowance and queue/timeout constraints on its [pricing page](https://expo.dev/pricing). Free accounts cannot incur EAS overage; after the quota is exhausted, further free builds/updates wait for the next reset ([Expo billing FAQ](https://docs.expo.dev/billing/faq/)). This hard-stop behavior fits the cost policy, but only if the account remains on Free.

Firebase identifies FCM as a no-cost product even for production use and says Spark requires no payment information ([Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)). Do not infer that adjacent Firebase or Google Cloud products are also free.

GitHub Free includes 2,000 standard-runner Actions minutes per month for a personal account and 500 MB shared artifact/package storage ([GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). Private-repository overage can be billable when an account has a payment method; budgets can stop usage when configured accordingly ([GitHub budgets](https://docs.github.com/en/billing/concepts/budgets-and-alerts)). The current account billing guard has not been verified, so hosted workflows must not be enabled yet. Larger runners are prohibited.

Map and notification policy details live in `ANDROID_INTEGRATIONS.md`.

## Operational budgets

Use lower internal thresholds than provider hard limits:

| Resource | Warning | Freeze nonessential use | Response |
|---|---:|---:|---|
| Supabase database | 50% | 75% | Remove test data through reviewed scripts; investigate growth |
| Supabase Storage | 50% | 75% | Stop optional evidence uploads; clean only confirmed orphan/test objects |
| Supabase egress | 50% | 75% | Reduce payload/image size and polling; preserve core demo traffic |
| Edge Function calls | 50% | 75% | Disable nonessential calls; keep manual fallback |
| EAS Android builds | 8/month | 12/month | Reserve remaining builds for release candidates; build locally |
| EAS Update MAU | 50% | 75% | Stop optional preview distribution |
| GitHub Actions minutes | Disabled until billing guard is verified; then 50% | 75% | Keep local checks authoritative and stop workflows before the included allowance is exhausted |
| Actions artifacts | Disabled until billing guard is verified; then 50% | 75% | Shorten retention and remove obsolete artifacts through reviewed UI action |

The project should not poll merely to keep a service active, manufacture traffic, or evade provider policy. Real smoke tests and ordinary development activity are acceptable.

## Supabase inactivity and recovery

Supabase may pause Free projects with low activity over a seven-day period. It sends a warning and pause email; a paused project can be resumed from the dashboard for up to one year ([Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)). There is no Free-plan SLA or automatic backup entitlement.

### Before the competition

- Keep schema, RLS, functions, and seed fixtures reproducible from versioned migrations.
- Run a real end-to-end smoke test each day during the final week; confirm the dashboard has no pause/quota warning.
- Create a manual, access-controlled logical export and Storage inventory at agreed checkpoints. Keep it outside Git and record only checksum/date/owner in the issue.
- Prepare a sanitized seed dataset and a prebuilt APK.
- Rehearse the cached/list fallback and, only if already proven, a local Supabase recovery path.

### If the project is paused

1. Do not change endpoints or create a replacement project immediately.
2. The project owner opens Supabase Dashboard and selects **Resume project**.
3. After status is healthy, run authentication, database, Storage, RLS-negative, and Edge Function smoke tests.
4. Record the incident and exact recovery time in an issue.
5. If resume fails, restore a new Free project from versioned migrations and the latest approved export only after rotating/reconfiguring project-specific public identifiers and OAuth redirects.

### If the service is unavailable during judging

- show cached read-only data with a visible offline banner;
- preserve drafts locally;
- do not fabricate successful applications/submissions;
- use the prepared demo narrative/video only if competition rules allow;
- use a local backend only if it was previously rehearsed and secured for the physical device—never improvise an exposed database or service-role key.

## Other recovery paths

- **EAS quota/unavailability:** use `npx expo run:android`/Gradle locally and the last verified signed APK; wait for the Free reset rather than upgrading.
- **Tile failure:** remove/hide the map surface and continue with distance-sorted list and manual locality.
- **Remote push failure:** the in-app activity center remains canonical; use local notifications for device-known events.
- **AI failure:** retain inputs and continue with the manual brief editor; never call deterministic output AI.
- **GitHub Actions quota:** run the documented verification locally, attach concise evidence to the PR, and resume hosted CI after reset. Do not add a payment method.

## PR cost checklist

- [ ] No card, billing account, paid plan, trial, credit, paid add-on, or billable runner/API is introduced.
- [ ] Official source and review date are present.
- [ ] Quotas and hard-stop/overage behavior are documented.
- [ ] Usage has a measurable internal threshold and owner.
- [ ] Feature remains honest and usable when the service is unavailable.
- [ ] Credentials are scoped, ignored, and absent from logs/issues/PR text.
- [ ] A reversible removal/export path exists.
- [ ] `FREE_TIER_AND_COST_POLICY.md`, the relevant ADR, and roadmap are updated.
