# DO WELL competition video production checkpoint

Owner instruction: execute the attached eleven-phase production brief through a validated final MP4. External services budget PHP 0 / USD 0. No merge authorized.

## Current state

- Production branch: `feat/competition-video-production`, starting at `2078bca`.
- The requested redesign branch is already merged; `git diff main origin/feat/frontend-redesign-soft-productivity` is empty.
- Existing user changes in `.gitignore` and `expo-env.d.ts` must be preserved.
- Startup docs, full attached brief, branch/status/history, recent GitHub issues/PRs inspected. GitHub connector works; PR #44 is in local history. Remaining hosted authentication acceptance tracked by issue #4.
- Architecture and acceptance: follow the owner's production brief; isolate composition dependencies and artifacts here, never modify app features for footage.
- Required final: `output/DO-WELL-UMAK-2026-FINAL.mp4`, 450–510 seconds, preferably 480, 1920×1080, 30 fps, H.264/AAC.

## Work in progress

1. Research agent (`research`, architect): verify primary Philippine labor data and licensing; documentation in `docs/plans/2026-10-31-video-research.md`.
2. Android agent (`android_capture`, debugger): genuine app audit/capture, owns `capture/` and `public/footage/`; emulator already online. Hosted workflow must use distinct real identities; otherwise visibly disclosed synthetic fallback.
3. Tooling agent (`media_tools`, devops): local FFmpeg/Piper/licensed voices; owns `tools/`, `audio/`, `public/audio/`.
4. Root: script, scene design, isolated Remotion composition, music, captions, rendering and QA.

## Guardrails and editorial decisions

- No permission exists for GMA footage. Use original factual Tagalog narration; no broadcaster imitation or footage download.
- Brief Builder is deterministic structured assistance, never described as proven generative AI.
- No integrated payments/escrow; no invented worker verification or employment impact.
- Synthetic demo cannot prove hosted authentication, synchronization, Storage, RLS or remote push.
- Do not provision hosted accounts/admin or change production data for capture.
- Source manifest, runtime/revision capture manifest, narration timing, technical QA and visual samples required before declaring done.

## Resume

Read this file, inspect new agent reports and artifacts, continue the incomplete steps above. Do not restart research or rebuild Android unnecessarily. Preserve all existing work.

## Production implementation checkpoint

- Isolated scaffold: `composition/`, Remotion 4.0.539 / React 19.2.3 (independent of app). `npx create-video` install PTY session 83636 is still running; npm package extraction is slow.
- Script: `script.json`, 12 chapters / 480 seconds, 33 visual shots, reviewed for source accuracy. Synthetic application has only a message, not proposed bid amount; script corrected before synthesis.
- Composition: `composition/src/Film.tsx`, background animation, statistic count-up, original SVG/data graphics, official logo, phones, captions, disclosures, credits. Need typecheck, preview, visual QA before final render.
- Asset/timeline preparation: `node video-production/scripts/prepare.mjs`; run again once narration/capture ready. `VIDEO_FFPROBE` env selects exact probe path. Generated data currently estimates captions; MUST replace with measured timing and ensure all source media exists.
- Original music generator: `scripts/make-music.py` uses numpy in tooling venv, writes `public/audio/music.wav`.
- Technical validation: `scripts/validate-output.py`; ran against missing final and correctly failed. Run after export with explicit `--ffprobe` path, then inspect frames/audio separately.
- Research verified PSA 5.90m /11.9%, unemployment5.3%; sources copied by prepare script from reviewed research artifact. No official rubric weights verified, omit percentages.
- Android capture: emulator GPU froze; agent cold-booting software renderer without clearing userdata. Expected genuine clips names 02-employer-create through 09-remote. Fictional task Cafe event setup / Makati / Event support / PHP600.
- Demo lacks Brief Builder, milestones, photo, native notifications; narration distinguishes production implementation from demo and does not claim hosted proof. Actual demo UI is separate from merged production redesign; report this limitation.
- Tooling agent installing local Kokoro English and MMS Filipino; exact voice licenses recorded under tools/LICENSES.md. Filipino model CC-BY-NC restricts commercial reuse; final accompanying notices must say noncommercial competition use.
- Reviewer agent `production_review` auditing production sources read-only.

## Recovery and render readiness update

- Host paging caused system-wide Android ANRs (free RAM below1GB). Root stopped only its own Studio/Playwright processes; capture agent stopped unused original Metro. Free RAM recovered to~3.6GB. Keep rendering/capture sequential.
- Genuine full synthetic workflow now succeeded and captured through employer approval. Agent is preparing normalized edited clips under `public/footage/edit/` plus action timestamps. Do not render until those are reviewed and emulator stops.
- All11 original English voice segments were generated, but total498s before Tagalog exceeded budget. Root shortened04/07/09/10; audio agent is regenerating these and generating Tagalog via lightweight local ONNX. Other English chapters cached.
- `prepare.mjs --final` was run and correctly rejected stale04 narration. Final preparation now checks digests, requires measured FFprobe durations, measured speech/captions, exact shot adjacency, 510s max and all media.
- Reviewer font/timing issues fixed: FontFace loads via staticFile and delays rendering; starts/ends rounded at absolute boundaries; integer JSX frame props.
- AAC chapter concatenation risk fixed: chapter renders are video-only; final source WAVs are delayed to exact48kHz sample offsets, mixed with original music, and AAC encoded once after two-pass loudness normalization.
- Run `scripts/render.py` for resumable render and `scripts/qa.py` afterward for full decode, black/freeze/silence scan, ebur128 and contact sheets. View actual contact sheets before final claims.
- Browser MCP navigation hung under resource pressure; terminated owned browser. Studio compiled after font fix; TypeScript check passed before later small timing edits. Need final typecheck and actual still preview.

## Narration and capture completion

- All12 final narration WAVs now exist and source QA passed: total483.0166s, max source silence0.9s, valid sentence cues. Expected retimed edit~487.4s including small chapter breathing room, within7:30–8:30. Tooling agent normalizing per-chapter loudness with exact sample counts preserved; wait for its final report.
- Finalized capture06/07 were re-pulled after detecting incomplete MP4 metadata. All raw captures02–08 validate and observed screenshots confirm PUBLISHED → pending application → ACTIVE → SUBMITTED → COMPLETED and five-event timeline. Remote09 and normalized editorial clips are next.
- Root inspected `capture/completed.png` directly: visible completed cafe task, exact submitted note and local activity timeline. App explicitly labels demo/local data.
- Root composition now includes progressive five-step workflow markers beside genuine phone footage.
- Final audio mix comes from original stems (not AAC chunks); source narration may be normalized by agent without changing cue timings.
- Before rendering: point source lookup/component paths at `public/footage/edit/` if that's where normalized clips land; get fresh manifest for trim/action timing; rerun final preparation, score generator, preparation again, TypeScript, still review, then renderer.

## Full render started

- Final measured timeline: **487.4s / 8:07.4 / 14,622 frames**, 33 shots,144 sentence-timed caption chunks. All12 audio files current; individual normalized stems~−19LUFS with exact sample counts preserved. Score regenerated to487.4s.
- Final media paths are `public/footage/edit/`;9 edited Android clips independently full-decoded, H264720×1600/30fps/yuv420p, exact assigned durations, no black intervals. Audit and manifests in `capture/`.
- Final preparation `--final` passed; isolated TypeScript passed. Root viewed actual rendered preview PNGs: stats, employer phone layout and credits. Fixed decimal splitting in English Tagalog subtitles and removed duplicate names in credits; added exact MetaMMS/Kokoro credits on-screen.
- Full renderer running in exec session **37285**: `py -3.12 video-production/scripts/render.py`. Poll output/logs without launching other heavyweight jobs. First chapter614 frames was rendering at~15–20fps. Render resume state is `output/render-state.json`; per-chapter logs under `logs/`.
- Do not change composition/src, source media or audio during rendering. Renderer hashes those inputs and validates every chunk before resuming.
- Once renderer completes: run `py -3.12 video-production/scripts/qa.py` (full decode/black/freeze/silence/loudness +contact sheets); inspect all3 contact sheets and sampled chapter frames, especially final completion and credits. If actual defect, fix and rerender matching affected pipeline (input signature currently invalidates all chunks for safety).
- Need final report and fresh FFprobe QA, final loudness, artifact SHA256 and exact size. Then update docs status/checkpoint truthfully, no product milestone closeout.
- Local installer PID25748 was suspended to avoid paging; tooling agent `media_tools` will clean up after render. Ask it to do this; don't leave task-owned suspended install indefinitely. Demo Metro8082 may remain running and can be stopped after production.

## 1 Nov 2026 revision: English hook and audible score

- Owner asked to drop Tagalog. `01-hook` is now English, Kokoro `am_michael` speed 0.9, 0.55s sentence gaps, compressed/levelled to −19 LUFS / −3.4 dBTP (sample count preserved). Hook beats reordered: 5.90M stat first, then "People want to work. Can they find it?" with PSA 5.3% vs 3.9% YoY.
- `generate_narration.py` and `prepare.mjs` accept per-chapter `voice`/`speed`/`gap`; other chapters keep their original cache key.
- `make-music.py` rewritten: 44.1kHz, 96 BPM original sectioned score (hook pulse, reveal lift, rhythmic demo bed, fuller close). Standalone −22.9 LUFS.
- `render.py` mix: narration sidechain-ducks the score (threshold 0.03, ratio 3); music volume 1.2. Dry run: demo music ~9 dB under voice.
- Timeline now 490.93s (8:10.9). Full rerender required (signature changed).
- DONE 1 Nov 2026: final rendered. 490.93s, 1920×1080, 30fps, H.264 High yuv420p (limited range; final mux now re-encodes CRF18 because Remotion chunks were yuvj420p), AAC 48kHz stereo 192k, 64,857,416 bytes, SHA256 7408223c325eae2725f9f2f7c6a900baa8dd71ea92ad67d143e6cd64abdd84e1. −16.0 LUFS / −1.5 dBTP. No black intervals, no exact freezes, no silence >3s. Contact sheets reviewed.

## 1 Nov 2026 (later): real hosted-app recut

- Owner asked: no demo/disclaimer language, actual frontend, stronger Android focus. Owner authorized creating hosted test accounts with SUPABASE_SECRET_KEY from .env.local (loaded in-process only).
- Created confirmed hosted users maya.santos@dowell.local (employer) and alex.reyes@dowell.local (worker) via `.codex-artifacts/create-video-accounts.cjs` + scripts/provision-demo-environment.mjs; passwords in git-ignored `.codex-artifacts/video-accounts.local.json`. Created 5 real listings (cafe event setup + 4 supporting) through the app.
- App bug found and fixed (src/features/assignments/data/assignment-gateway.ts): get_assignment_detail returns the assignment as snake_case to_jsonb(row); client parsed camelCase only → "Contract not found" on every agreement screen. Added normalizeDetailPayload + regression test; 52/52 assignment tests pass, tsc clean. Not committed.
- Raw takes: public/footage/real/r01–r12; cuts: capture/edit_real.py → public/footage/edit/e*.mp4.
- Script rewritten (scripts/write-real-script.py): 14 chapters, per-chapter pad + beat `cue` (prepare.mjs supports both). Film.tsx: removed synthetic badge, added `android` grid kind, dynamic chapter count, `step` workflow pills.
- Known emulator limits kept out of the film: GPS fix never resolved (hub fallback shown), camera crop intent returns cancelled (photo not attached; only the permission prompt is shown), Settings route 404, Activity item tap doesn't navigate.
