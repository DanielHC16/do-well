# Content-first composition — 2026-10-31

This approved frontend follow-up on `feat/frontend-marketplace` prioritizes discovery and work content rather than adding another color treatment. Indigo/lavender/white tokens, bundled Inter, original owner-logo renditions and existing icon licensing are retained.

## Scope and files

- `src/features/shell/components/AuthenticatedHomeScreen.tsx`: one concise dashboard heading, combined search/filter zone, one horizontal work-mode/category toolbar with accessible browsing context, shorter empty copy, and existing area control beside results. Search, supported filters, optional location, real listing metrics, pagination and destinations stay connected to existing gateways.
- `src/features/shell/components/MarketplaceShell.tsx`: optional compact secondary heading for My Work/Activity removes the workspace eyebrow and long subtitle while retaining title, role control, navigation and safe areas.
- `src/features/work/screens/MyWorkScreen.tsx`: concise section summary, section/status tabs, compact application/listing/assignment cards and preserved authoritative statuses, pagination, refresh and detail routes. Counts represent loaded rows rather than unverified account totals.
- `src/features/shell/components/AuthenticatedActivityScreen.tsx`: recent updates take priority, refresh becomes a compact accessible action, permission setup becomes a small optional interface, and shared loading/error/empty states replace oversized utility panels. Existing opt-in, scheduling, deduplication and event operations remain.
- `src/shared/ui/index.tsx`, `src/shared/ui/theme.ts`: 48-point original empty-state illustration beside concise title/body, contained action instead of a full-width block, inline loading/error headings and retry, 14-point supporting type, rectangular filter controls with 12-point rounding; status badges retain their distinct shape. Cards retain 18-point corners and consistent border/padding tokens.
- Related Home/Shell/Work/Activity component tests, shared primitive tests, and protected-route copy assertions cover current content and operations. Fixtures exist only in tests; no fabricated data enters production screens.

No backend, auth, database, environment, dependency, credential, generated native file, or app configuration change is part of this follow-up. Existing earlier uncommitted M21 changes are retained. No commit, push or merge.

## Verification and acceptance

Formatting, ESLint, strict TypeScript and **103 Jest suites / 628 tests passed**. Shared primitive tests cover the four empty-state variants, labelled callbacks, missing-action omission and retry; Home/Work/Activity tests cover populated rows, empty data, deferred loading, rejected reads/retry, status selection, paging, correct loaded-row summaries, permission opt-in and existing navigation. Test fixtures are isolated to component tests. Test-first compact-header/loading/count/content-priority cases failed before implementation and passed afterward. A final persistent Android filter scrollbar passed focused Home verification (15 tests) and typecheck.

Default-size Android 16 Development Build inspection confirmed Home results/empty state above the fold, compact My Work tabs/summary, recent Activity before the smaller alerts banner, shared logo, and navigation spacing. A display-service stall during a large-font/density change required an emulator reboot; no data wipe, native regeneration or app rebuild occurred. Subsequent inspection succeeded at **360dp / 150% text** for Home, My Work and Activity: scrollbar visibility, intact horizontal tab labels, Completed-section selection, content scrolling, empty-state action clearance above navigation, banner wrapping and Android back-to-Home behavior. It caught mid-word work-tab wrapping, which was corrected with intrinsic single-line horizontal tabs and a regression test. Final full suite again passed **103 suites / 628 tests**. Density was restored to physical420, font1.0 and the original hardware-keyboard display preference0; all were verified/restored before completion. Local screenshots/test JSON are under ignored `.codex-artifacts/`, including `composition-final-tests.json`.

The emulator uses a floating Gboard/handwriting toolbar. Input focus was inspected, and temporarily changed hardware-keyboard display preference was restored to its original value. This does not establish standard docked-keyboard acceptance. Real two-account workflows, TalkBack, populated-data device acceptance and native icon/splash acceptance remain separate checks. No production mutation was submitted during inspection.

Review also noted the existing Activity assignment route follows the selected workspace. Cross-role event navigation should receive separate functional acceptance; this density follow-up preserves existing event-routing behavior rather than changing participant authorization or server contracts.

```powershell
npm.cmd start
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:run
```

Reload the existing Android Development Build for this JavaScript-only follow-up; no prebuild or native rebuild is needed.
