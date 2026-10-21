# ADR 0004: Zero-cost AI inference

- Status: Proposed
- Date: 2026-10-21

## Context

The AI Job Brief Builder is a differentiator and must perform real model inference. Paid APIs, credit-card activation, promotional-credit dependence, and automatic overage are prohibited. The development laptop has 16 GB RAM, an RTX 3050 Laptop GPU with 4 GB VRAM, and no Ollama installation yet. Target-phone memory and inference performance are unverified.

## Decision

Run a time-boxed M10 feasibility experiment before committing to a production provider. The recommended first experiment is a pinned Ollama release in local-only mode with pinned Apache-2.0 Qwen3 small instruct candidates, starting with `qwen3:1.7b-q4_K_M` and comparing `qwen3:4b-instruct-2507-q4_K_M` only if latency and memory allow. Record exact model digest, license, download size, warm/cold latency, peak RAM/VRAM, structured-output validity, and rubric quality on the actual laptop.

The phone never calls Ollama directly. Keep Ollama bound to `127.0.0.1` and place a minimal inference-only LAN gateway in front of it. The gateway binds only to the selected private interface, requires a random short-lived demo bearer token or pairing code, exposes only the brief-generation operation, validates request/response schemas, caps body size and output tokens, sets timeouts/concurrency/rate limits, and redacts logs. Windows Firewall limits access to the private network/device. No router port-forward, public tunnel, model-management endpoint, or internet exposure is permitted. Pre-download and checksum the model before the demo.

The application calls a provider interface with a versioned request/response contract. A deterministic template/manual editor is always available but is labeled as a fallback, never as AI. Generated text is a draft: validate schema and length, display provenance and editable fields, and require human confirmation before publishing. Disable cloud features and send no secrets, precise location, or unnecessary personal data to the model.

On-device inference with `llama.rn` is an optional second experiment, not the initial dependency. It requires an Expo development build, adds a large model/download and native compatibility risk, and must be tested on the actual target phone. Hosted free tiers are not the baseline because quotas and terms can change; no hosted provider may be enabled without a fresh no-billing review and a hard failure at quota.

## Alternatives considered

- Paid hosted LLM APIs: rejected by budget.
- Unauthenticated Ollama bound to `0.0.0.0`: rejected because the local API has no authentication and includes management operations.
- Deterministic templates presented as AI: rejected as misleading.
- On-device inference as the only plan: deferred pending phone benchmarks and package compatibility.

## Consequences

- Competition AI works without public internet when laptop and phone share a private LAN/hotspot.
- The demo depends on the prepared laptop unless on-device inference later passes its gate.
- Output quality is bounded by small local models, so constrained JSON, field-level editing, deterministic validation, and a curated prompt/eval set are mandatory.
- AI remains a milestone behind the core marketplace vertical slice and has a clear manual degradation path.

## Go/no-go criteria

- One hundred percent of responses either pass the strict schema or safely return the manual fallback, with at least 95% schema-valid first responses on ordinary fixtures.
- Median warm response at or below 5 seconds, p95 at or below 10 seconds, and cold response at or below 20 seconds for the agreed prompt size on demo hardware.
- No crash or unrecoverable timeout in 20 consecutive runs; bounded memory fits alongside the development stack.
- Human rubric confirms useful title, scope, deliverables, schedule, and safety language without inventing pay or location.
- Authenticated LAN access succeeds offline and unauthorized requests fail closed.
