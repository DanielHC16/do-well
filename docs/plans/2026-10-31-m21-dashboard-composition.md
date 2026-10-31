# M21 follow-up — Dashboard composition and frontend consistency

**Status:** approved frontend scope; implementation and visual acceptance pending.

**Authorization:** the owner's latest full-frontend redesign direction supersedes the earlier incremental styling approach. Deliver a composed marketplace dashboard and consistent supporting screens using the existing application architecture. This plan records that direction and its acceptance boundaries; it does not authorize backend, environment, native-project, dependency, deployment, or merge changes.

## Source audit

- `MarketplaceShell` currently supplies a brand/tagline row, workspace eyebrow, 34-point title, subtitle, and workspace switcher. Home adds another greeting/hero headline before search, a large location panel, discovery filters, a location explanation, and an uppercase feed heading. These compete for hierarchy and push useful work below several introductory blocks.
- The large greeting panel repeats the shell's message. The second location block repeats the public area without making the selected discovery area versus profile area clear. Consolidate discovery locality into one compact control; profile locality remains account information rather than an implied active GPS filter.
- My Work and Profile use promotional headlines/subtitles and multiple explanatory cards before the primary content. Prefer clear page names, compact account/work summaries, and task-focused sections. Keep useful empty/loading/error guidance.
- Typography currently mixes 34-point page titles, 22-point sections/cards, a separate 28-point auth title, and individually styled labels. Several uppercase labels compete with actual content. Use one deliberate type hierarchy across auth, dashboard, forms, details, work, activity, profile, settings, and supporting native-permission/evidence UI.
- `LocationBar.tsx`, `LocationSelectorModal.tsx`, and `EvidenceAttachmentPicker.tsx` reference `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, or `Inter_700Bold`. No Inter package, bundled Inter font file, or registered text-font loader was found in the current application. These names cannot be relied on to render the requested weights consistently. Existing Material Symbols supplies icons, not an Inter text family.
- Existing routes, validated gateways, auth/profile gates, notifications, optional location, scoped caches, and form drafts already provide the behavior needed for the redesign. The composition change should use those boundaries rather than introduce new API/state ownership.

This is a source-based audit, not new emulator evidence. Earlier screenshots/tests do not prove the acceptance of this new composition.

## Visual architecture

1. Preserve Expo Router entry/layouts, existing providers, feature gateways, and authorization contracts. Refine shared presentation and thin feature screens. Continue the existing React Native `StyleSheet`/central theme approach.
2. Compose Home in this order: compact brand/account header; **one** main headline; concise worker/employer workspace control; search; compact optional locality/radius control; work-mode/category filters; real work content and its supported actions. Avoid a second hero or competing marketing headline. Keep list headers inside the efficient scrolling list so content remains reachable with the keyboard open.
3. Use tokens consistently: **28** page title, **20** section title, **16** card title, **15** body. Preserve readable supporting labels and proportional line heights; map these roles explicitly rather than changing every heading into a card title. Maintain centralized colors, spacing, radii, elevation, and minimum 48-point touch targets.
4. Use indigo for primary actions and key hierarchy, white/soft neutral surfaces, muted lavender secondary surfaces, and restrained mint accents. Keep readable neutral text. Use icons to clarify actions/status rather than decorate every line.
5. Use the native system text family with explicit weight tokens. Replace unresolved Inter names with supported system weights without adding a package or remote font dependency. If Inter becomes a separately approved requirement, bundle licensed font files, register them before use, and verify each referenced weight; naming a family alone is insufficient.
6. Keep forms scrollable, keyboard-safe, and visibly labelled. Preserve large-font wrapping and explicit loading, empty, error, pending, and confirmed states. Do not truncate essential actions or place large fixed content above the keyboard-constrained viewport.

## Approved logo asset

The owner-provided **`Do Well App LOGO.svg` supersedes the earlier PNG for in-app branding**. Preserve its original bytes, colors, composition, and aspect ratio. Do not trace, recolor, crop, or replace it with text. Retain the previous PNG as an existing project asset; this frontend direction does not authorize changing native splash/icon configuration.

Safe XML inspection of the new file found:

| Property | Verified value |
| --- | --- |
| File size | 177,443 bytes |
| Root | SVG |
| Declared size | 192 × 192 |
| View box | `0 0 144 143.999998` |
| Graphics | Two embedded PNG image elements; no path elements |
| Remote image references / scripts | None found |

The SVG is a self-contained image container, not path-only artwork. Use the already-installed `expo-image` renderer only after confirming its actual Android handling of this asset, including the embedded images. Preserve `contain` sizing and a square layout footprint. Parent verification owns rendering evidence; XML validity alone does not prove display compatibility. Do not print or duplicate its embedded base64 payload in reports or prompts.

## Data and behavior boundaries

- Only display metrics derived from actual successful gateway responses. A paginated list length is a **loaded-item count**, not a marketplace/account total. Do not invent earnings, completion rates, ratings, unread counts, distances, matches, applicants, or gigs.
- If the current contracts cannot provide an accurate summary, omit that metric or present an honest empty/loading/error state. Do not add new backend queries or totals merely to fill decorative dashboard cards without inspecting and validating their existing support.
- Maintain PHP compensation, remote browsing without location permission, manual locality selection, approximate public locations, explicit worker selection, and server-confirmed agreement/submission/milestone states.
- Preserve existing authentication callbacks/validation, protected routing, settings, reporting, notification permissions, API arguments, schemas, scoped persistence, and retry/idempotency behavior. No backend, service, credential, permission, or billing change is part of this design work.
- Keep production data separate from the labelled offline demo. Structured skills/experience/reviews and other absent contracts stay honestly documented rather than fabricated.

## Acceptance and verification

- One clear headline and compact header/search/locality composition replaces stacked introductory sections on Home. Worker and employer variants have clear, useful primary actions.
- The new original SVG displays correctly in in-app brand placements with its proportions intact. No native asset pipeline or configuration change is required for this follow-up.
- Page/section/card/body tokens follow 28/20/16/15 consistently. No unresolved `Inter_*` family references remain in rendered application components.
- Supporting auth, work, detail/form, activity, profile, settings, location, and evidence surfaces use the same hierarchy and spacing without rewriting working workflows.
- All rendered metrics are truthful about their source and pagination scope. All mutation success states still depend on existing server operations.
- Keyboard, Android back behavior, safe areas, 360dp layout, and enlarged system text remain usable. Decorative symbols remain hidden from accessibility; controls and real work cards expose meaningful names/status/details.
- Run formatting, lint, strict TypeScript, relevant test-first behavior checks, and the complete existing Jest suite. Verify imports/routes and inspect the Android development build for the new composition and SVG. Report device evidence separately from bundle/test checks.
- Keep roadmap/handoff/final report aligned with verified results. GitHub CLI remains unauthenticated; do not claim issue/PR creation or review. No commit, push, merge, prebuild, native rebuild, or environment/backend change is implied by this plan.

## Known independent runtime limitation

The previously reproduced navigation warnings arise during Android Activity recreation in the retained development runtime. This composition work must not remove legitimate nested stacks, suppress warnings, patch dependencies, or introduce a custom root lifecycle merely to hide that separate issue. Preserve the existing investigation record and test new visuals after a clean runtime restart.
