# DO WELL · UMAK IT Skills Olympics 2026

**Team:** Ang Huling Pull Request — Daniel Hardy Camacho, Hershey Anne P. Dalangin, Carla R. Mabutas.

## Research and attribution

- Philippine Statistics Authority, *August 2026 Labor Force Survey*, reference 2026-325, released 7 October 2026: https://psa.gov.ph/statistics/labor-force-survey/press-release/node/1684084287 . Underemployed people 5.90 million, underemployment 11.9%, unemployment 5.3%. Graphics adapted for this film. PSA website content CC BY 4.0 unless otherwise stated: https://creativecommons.org/licenses/by/4.0/ . Month-on-month and year-on-year directions are distinguished.
- News5, 7 October 2026, corroborating report: https://news.tv5.com.ph/breaking/read/unemployment-underemployment-decline-in-august . Factual reference only; no footage/audio reproduced.
- Philippine Institute for Development Studies, Policy Note 2025-15, 29 September 2025, *Building a Strong and Sustainable Pathway for Middle-Skilled Workers*: https://pids.gov.ph/publication/policy-notes/building-a-strong-and-sustainable-pathway-for-middle-skilled-workers . Context for connecting skills with demand; no causal or product-impact claim.
- No GMA broadcast footage, audio, logos or anchor likeness was used. The English opening hook was written independently from the cited PSA figures and synthesized locally.

## Voice and music

- Original English narration: Kokoro-82M v1.0, voices `af_heart` (main narration) and `am_michael` (opening hook), Apache License 2.0. Model and attribution: https://huggingface.co/hexgrad/Kokoro-82M . Local ONNX conversion: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 . Model training attribution includes SIWIS (CC BY 4.0) and Koniwa (CC BY 3.0); see the publisher's model card and accompanying `PRODUCTION_LICENSES.md`.
- The voices are synthetic and do not represent a journalist or named public figure.
- Music: *Connection*, original procedural score (96 BPM, sectioned per chapter, ducked under narration) created locally for this presentation. No third-party music recordings or samples.

## Application evidence

All app footage is the production Android app `com.anghulingpullrequest.dowell` (redesigned frontend, branch `feat/competition-video-production` at `2078bca` plus the assignment-detail fix below), running against the hosted Supabase backend. Two separate confirmed test accounts were used: Maya Santos (employer) and Alex Reyes (worker), with test listings created through the app. Recorded on 31 Oct 2026 with ADB `screenrecord` (720×1600) on the API 35 emulator: Job Brief Builder, publish, discovery with the Android approximate-location prompt and Metro Manila hub/radius, application, notification-permission prompt, selection, agreement acceptance, milestones, milestone progress, completion note with the camera-permission prompt, Android notifications in the shade, review and approval, offline snapshot mode, and the worker's completed view.

Editing speeds up typing and waits and cuts unrelated stretches; every frame is from those recordings and the final real frame is held. The emulator's test-pattern camera image was not used. Segment-level edit decisions are in `capture/edit-real-manifest.json`.

## Production

Remotion 4.0.539, licensed free for this three-person team; local FFmpeg/FFprobe 9.0.2. Outfit font is bundled under SIL OFL 1.1, with notices in repository`branding/licenses/Outfit-OFL.txt`. Owner-supplied DO WELL logo used with the requested brand palette. External-service spend PHP 0 / USD 0; no paid inference, billing, payment method or expiring credits.

Exact model/runtime hashes and full notices are in `PRODUCTION_LICENSES.md`. Technical and signal reports accompany the completed export. Keep these attribution and license notices with the video.
