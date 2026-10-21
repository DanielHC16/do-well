# Do Well

Do Well is an Android productivity application for the UMAK IT Skills Olympics 2026. It connects people offering legitimate short-term paid gigs with nearby or remote workers and follows work from a clear brief through application, assignment, submission, and completion.

## Status

Phase 3 architecture and development planning are in progress. The Expo application has not been initialized and no product feature is represented as implemented.

Confirmed foundations:

- React Native and TypeScript with Expo development builds and Expo Router
- Supabase Auth, PostgreSQL, Row Level Security, private Storage, and Edge Functions where justified
- One account with worker and employer modes; one worker per gig in the MVP
- Human-reviewed AI job briefs, explainable matching, and manual fallbacks
- A hard external-service spending limit of PHP 0 / USD 0

## Repository safety

Only `.env.example` is version-controlled. Local environment files, OAuth client downloads, cloud credentials, signing material, and generated native/build output are ignored. Never place privileged credentials in an `EXPO_PUBLIC_*` variable.

## Getting started

Application setup commands will be added in Milestone M01 after the Phase 3 architecture is approved. Until then:

1. Read `AGENTS.md`.
2. Review the open Phase 3 architecture pull request.
3. Do not initialize or install application dependencies on `main`.

## Documentation

The durable product, architecture, security, setup, workflow, roadmap, and session-handoff documentation is developed on `docs/phase3-architecture` and will appear under `docs/` after review and approval.
