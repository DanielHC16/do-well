# Local media toolchain

All tooling is separate from the Expo application. See `toolchain.json` for verified executable paths, versions and model hashes; `LICENSES.md` for exact speech rights.

1. Create Python3.12 virtual environment: `py -3.12 -m venv tools/venv`.
2. Install minimal local inference dependencies: `tools/venv/Scripts/python.exe -m pip install --no-compile -r tools/requirements.txt`.
3. Run `tools/venv/Scripts/python.exe tools/download_assets.py` and `tools/venv/Scripts/python.exe tools/download_tagalog.py`. These fetch the exact ONNX voice models, tokenizer configuration, FFmpeg/FFprobe and MIT Kokoro vocabulary/config source. Model hashes are checked against the verified production assets.
4. Generate speech: `tools/venv/Scripts/python.exe tools/generate_narration.py script.json`. Existing matching chapters are reused; `--only CHAPTER-ID` regenerates one selected chapter when its script has changed.
5. Normalize speech with `tools/venv/Scripts/python.exe tools/normalize_narration.py`, then validate actual PCM audio and captions: `tools/venv/Scripts/python.exe tools/validate_audio.py`.

Run these commands from `video-production/`. Original speech assets are at `public/audio/`; measured sentence cues and complete narration manifest are at `audio/`.

The optional full Python speech stack installer was suspended during capture, then cancelled during rendering to release resources. No installer process remains. Its audit record is `optional-install-status.json`. The optional PyTorch/Transformers stack did not complete and is not required or used by this minimal ONNX pipeline. No working environment/model assets were deleted. A fresh `pip check` after cancellation reported **No broken requirements found**.

The Signal QA report checks actual file content, duration, peaks, cue bounds and unintended long silence. It does not claim a human listening review or prove subjective naturalness.
