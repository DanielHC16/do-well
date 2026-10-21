# Development Workflow

## Principles

- `main` is always reviewable and deployable.
- Work is issue-led, milestone-sized, and performed on short-lived branches.
- Conventional Commits describe one cohesive change.
- Every substantive milestone uses a pull request and review; the project owner approves merges.
- Tests and documentation are part of the change, not follow-up work.
- Secrets, private data, generated builds, and local credentials never enter Git, issues, logs, or screenshots.
- External spend remains zero; every service change passes `FREE_TIER_AND_COST_POLICY.md`.

The only direct-to-`main` exception was the safe repository bootstrap because no commit existed. Commit `3af082b` established that bootstrap. All subsequent substantive work follows the PR flow.

GitHub Issues are the durable unit for planning/tracking tasks, bugs, metadata, and dependencies ([GitHub Issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues)). Pull requests provide the discussion, commits, checks, changed-file review, and merge-status context needed before integration ([GitHub pull requests](https://docs.github.com/en/pull-requests/reference/pull-requests)).

## Work item hierarchy

```text
Milestone (M00-M14)
  -> GitHub Issue with acceptance criteria
    -> short-lived branch
      -> logical commits
        -> pull request + review evidence
          -> owner-approved merge
```

Repository labels created for M00:

- phase: `phase:architecture`, `phase:implementation`
- area: `backend`, `frontend`, `android`, `authentication`, `database`, `ai`, `security`, `testing`, `documentation`
- priority: `priority:p0`, `priority:p1`
- state: `blocked`

Each M00-M14 issue carries its milestone code in the issue title rather than a second set of milestone labels. Add a new label only when a repeated tracking need cannot be represented by this taxonomy; avoid duplicate `type:*`, `area:*`, or `status:*` families.

An issue must state the problem, approved scope/non-scope, dependencies, acceptance criteria, verification, cost/security impact, and unresolved decisions. Link it to the roadmap milestone.

## Branches

Start from the latest `main` after confirming the working tree is clean:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/gig-management
```

Use lowercase kebab-case:

- `docs/phase3-architecture`
- `chore/expo-initialization`
- `feat/supabase-auth`
- `feat/database-schema`
- `feat/gig-management`
- `feat/ai-job-builder`
- `feat/android-location`
- `test/security-validation`
- `fix/auth-callback`

Do not mix independent milestones, opportunistic refactors, dependency upgrades, or formatting churn into one branch. Do not force-push a shared branch. If an agent/developer shares the worktree, assign non-overlapping file ownership and re-read status before patching.

## Implementation loop

1. Read `AGENTS.md`, `docs/SESSION_HANDOFF.md`, the roadmap milestone, linked issue, and relevant ADRs.
2. Confirm branch, status, remote, and that no unrelated work will be overwritten.
3. Write the failing test or verification fixture first for behavior changes.
4. Implement only the approved slice.
5. Run focused checks continuously, then the full milestone gate.
6. Review `git diff`, generated files, dependency changes, permissions, public env use, and cost impact.
7. Scan for secrets without printing local secret files.
8. Stage an explicit allowlist of paths; do not use broad staging until the list has been reviewed.
9. Commit a logically valid unit using a Conventional Commit.
10. Push the branch, open/update the PR, run reviewer-agent/read-only review, and resolve findings.
11. Obtain owner approval before merge.
12. After merge, update the handoff and next milestone/issue; delete the remote branch only when no recovery need remains.

## Commit rules

Format:

```text
<type>(<scope>): <imperative summary>
```

Examples:

```text
docs(architecture): define zero-cost Android integrations
chore(setup): initialize Expo SDK 58 project
feat(auth): add Supabase browser OAuth flow
test(gigs): cover duplicate application prevention
fix(submissions): reconcile timed-out evidence upload
```

Use `feat`, `fix`, `test`, `docs`, `chore`, `refactor`, `perf`, `build`, or `ci`. Keep the subject specific. A commit may represent verified intermediate progress, but do not label an unfinished milestone complete.

Before committing:

```powershell
git status --short
git diff --check
git diff --staged --name-status
git diff --staged
```

Stage named files/directories, for example `git add docs/ANDROID_INTEGRATIONS.md`. Never stage `.env.local`, OAuth/service-account JSON, signing files, APK/AAB output, or a local database/export.

## Verification gates

Once M01 creates the app scripts, every PR runs in this order:

1. formatting/lint;
2. TypeScript typecheck;
3. unit/component tests;
4. integration/RLS tests where relevant;
5. Expo configuration/doctor and non-secret bundle/export check;
6. Android build/device checks when native configuration changes.

The canonical commands must live in `package.json` and CI rather than in chat. Until M01, documentation PRs use:

```powershell
git diff --check
git status --short
```

and manually verify internal links, source links, status claims, and that no secret files are staged.

GitHub Actions must use least-privilege `permissions`, pinned action major or immutable SHA per repository policy, dependency caching keyed by the lockfile, concurrency cancellation for superseded branch runs, and the Free-plan budget in `FREE_TIER_AND_COST_POLICY.md`. Do not run EAS cloud builds on every PR. Reserve them for approved native/release milestones; use local Android compilation for ordinary native verification.

## Pull request contract

Each PR contains:

- linked issue (`Closes #...` only when all acceptance criteria are met);
- goal and explicit non-scope;
- changed files/components and any migration/config change;
- test commands with actual summarized results;
- Android device/build evidence and screenshots for UI/native changes;
- security/privacy, permissions, offline, and zero-cost impact;
- risks, known limitations, manual steps, and rollback;
- documentation/ADR updates;
- reviewer-agent findings and resolution.

The reviewer treats model-generated code like human-generated code and verifies APIs against the installed versions. A green check does not replace product-owner approval.

### Review severity

- **P0/blocker:** secret exposure, authorization/RLS bypass, destructive data loss, billing risk, broken critical journey.
- **P1/high:** incorrect state transition, duplicate mutation, unusable offline/error path, crash, inaccessible critical control.
- **P2/medium:** maintainability, missing noncritical test, performance or UX issue with a safe workaround.
- **P3/low:** small cleanup or optional improvement.

P0/P1 findings block merge. P2 should be fixed or moved to a linked issue with owner agreement. P3 may be follow-up.

## Merge and rollback

Prefer squash merge when a branch's intermediate commits are not independently valuable; preserve commits when they form useful, tested units. The final commit message remains conventional. Never merge with failing required checks or unresolved owner decisions.

Rollback by change type:

- App/documentation: revert the merge commit through a new PR.
- Native configuration/dependency: revert and rebuild the previous verified APK; keep the old artifact/checksum until the new build passes.
- Database: deploy backward-compatible migrations; rollback means redeploy prior app plus a **forward-fix migration**, not editing shared schema manually.
- Feature risk: keep behind a default-off feature flag where practical.
- External integration: disable the feature and use its documented fallback; do not solve an outage by enabling billing.

## Blocked or interrupted work

When a session ends before completion:

- leave the branch intact;
- commit only valid, non-secret intermediate work if useful;
- update `docs/SESSION_HANDOFF.md` with branch, last verified commit, exact status, commands/results, blockers, and next command;
- update the issue/PR rather than relying on chat history;
- never mark the milestone `COMPLETED` without its acceptance evidence.
