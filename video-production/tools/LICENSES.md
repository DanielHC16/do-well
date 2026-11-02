# Local production tools and speech provenance

Verified 31 October 2026. External services cost: PHP 0 / USD 0. Downloads only; all speech synthesis runs locally. No cloud inference, trial credits, payment cards, or usage-based services are used.

## Remotion

Remotion permits free use by individuals, teams of up to three people, and nonprofit organizations. The brief identifies a three-person student competition team. No account, payment method, or license purchase is required under those eligibility conditions.

- Exact terms: https://github.com/remotion-dev/remotion/blob/main/packages/core/LICENSE.md
- Official FAQ: https://www.remotion.dev/docs/license/faq

## English narration: Kokoro

- Model: **hexgrad/Kokoro-82M v1.0**, voice **af_heart**. Model weights: **Apache-2.0**.
- Model card and provenance: https://huggingface.co/hexgrad/Kokoro-82M
- Voice list: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
- Local ONNX runtime wrapper: **kokoro-onnx**, **MIT**, https://github.com/thewh1teagle/kokoro-onnx
- The final generator runs the verified ONNX graph directly with ONNX Runtime and uses Piper's installed espeak-ng phonemizer. The MIT Kokoro vocabulary/config source and its license are retained locally. No Torch/cloud inference is required.
- ONNX/model file provenance: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
- Training attribution retained from model card: SIWIS (CC BY 4.0), https://datashare.ed.ac.uk/handle/10283/2353 ; Koniwa (CC BY 3.0), https://github.com/koniwa/koniwa

The narration is synthetic and original. It does not represent an actual journalist or imitate a named public figure.

## Tagalog narration: Meta MMS

- Exact model: **facebook/mms-tts-tgl**.
- Pinned revision: **79182edde3d60484a9e7a666240917f454138a0b**.
- ONNX conversion by Will Wade: https://huggingface.co/willwade/mms-tts-multilingual-models-onnx ; revision **4f49fc254f11ddb0e35fbf25b6e48b04463a6779**, `tgl/model.onnx`; same **CC-BY-NC 4.0** license. This lightweight runtime avoids loading PyTorch during capture/render.
- Model license: **Creative Commons Attribution-NonCommercial 4.0**.
- Primary model card: https://huggingface.co/facebook/mms-tts-tgl
- License: https://creativecommons.org/licenses/by-nc/4.0/
- Attribution: Vineel Pratap et al., Meta AI, *Scaling Speech Technology to 1,000+ Languages* (2023), https://arxiv.org/abs/2305.13516 .

This model is used only for the requested noncommercial educational competition presentation. Any later commercial adaptation needs replacement narration or separate permission. No original news recording is included. The Tagalog words are an original script supported by cited public statistics.

## Investigated Piper fallback

- Engine: **OHF-Voice/piper1-gpl**, **GPL-3.0**, https://github.com/OHF-Voice/piper1-gpl . Installed locally; not embedded into the app.
- Candidate: **en_US-ljspeech-high**, source dataset **public domain**: https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/high/MODEL_CARD and https://keithito.com/LJ-Speech-Dataset/ . A sample was generated for comparison.
- **Lessac was not selected**: its exact data source has a research-only named-license procedure, https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html . Broad repository metadata was not treated as permission for the exact voice.
- **Ryan was not selected**: exact source card says CC-BY-NC-SA 4.0.

## Video utilities

- FFmpeg/FFprobe: https://ffmpeg.org/ ; Windows binary source https://www.gyan.dev/ffmpeg/builds/ . Gyan builds are GPLv3. Local production use; binaries are not included in the final MP4.
- imageio-ffmpeg (BSD-2-Clause) provides an immediately available local FFmpeg binary: https://github.com/imageio/imageio-ffmpeg .
- Python and dependencies are isolated in `tools/venv/`; root app package versions and lockfile are unchanged.

No third-party music recording or copyrighted broadcast clip has been licensed or used by this tooling task.
