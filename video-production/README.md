# DO WELL competition film

This isolated production workspace implements the owner's 31 October 2026 video brief and subsequent real-app recut. PR #45 also includes the assignment-detail snake_case parsing fix discovered during that capture; mobile dependency versions are unchanged.

## Resume production

Read [CHECKPOINT.md](CHECKPOINT.md). Source narration and scene intent live in `script.json`. Research evidence is in `research/sources.json` and `../docs/plans/2026-10-31-video-research.md`. Genuine Android source clips belong in `public/footage/`; they must never be replaced by fabricated app screens.

1. Install composition dependencies: `cd composition; npm ci` (Windows PowerShell).
2. Restore licensed local tools/models according to `PRODUCTION_LICENSES.md` and `tools/toolchain.json` (ignored machine paths). Install under `tools/`, never into the mobile app's dependency tree.
3. Generate narration: `tools/venv/Scripts/python.exe tools/generate_narration.py script.json`. Capture actual Android clips listed by `scripts/prepare.mjs`.
4. From the repository root: `node video-production/scripts/prepare.mjs --final`, then `video-production/tools/venv/Scripts/python.exe video-production/scripts/make-music.py`.
5. Render: `video-production/tools/venv/Scripts/python.exe video-production/scripts/render.py`. Each chapter is independently rendered and frame-count validated; completed matching chunks resume after interruption.

The required deliverable is `output/DO-WELL-UMAK-2026-FINAL.mp4`. `output/technical-qa.json` records the actual FFprobe results. Technical validation alone does not establish editorial approval: inspect extracted frames, full decode, silence/black/freeze detection, source framing and final loudness before delivery.

## Editorial boundaries

The current script uses recordings of the redesigned production app with two hosted test identities and five listings, as recorded in the later 1 November checkpoint. The owner authorized that earlier account provisioning; it grants no blanket permission for new hosted mutations. Earlier synthetic offline captures remain historical fallback material and use a separate interface. Neither footage nor narration establishes complete authentication/device acceptance, private image Storage, RLS or remote push. The recorded GPS and camera limitations remain explicit in the checkpoint and acceptance issue #46.

The default Brief Builder is deterministic assistance. Payments/escrow are absent. No employment outcomes or worker verification are claimed. Third-party broadcaster content is excluded; an original English hook narrated from cited PSA figures replaces the proposed GMA opening. Exact competition rubric weights and official duration rules were not independently corroborated; the export follows the owner's requested 7:30–8:30 window.

Voice generation is local. All narration uses Kokoro-82M (Apache-2.0); the earlier CC BY-NC Tagalog draft was removed. The accompanying license manifest must travel with the video. The ambient score is an original procedural composition without third-party music samples.

## Artifact policy

Local models, Python environment, raw captures, audio, render chunks and exports are ignored. Source code, citations, checkpoint and license notices can be reviewed in Git. The root `.gitignore` and `expo-env.d.ts` contained owner changes before this task and are preserved. On 2 November the owner authorized PR fixes and merging after verification. This does not establish that a final recut export passed QA.
