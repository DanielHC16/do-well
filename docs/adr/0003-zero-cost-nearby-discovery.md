# ADR 0003: Zero-cost nearby discovery

- Status: Proposed
- Date: 2026-10-21

## Context

Nearby gigs are central, but Google Maps billing is prohibited. Public OpenStreetMap tiles are community infrastructure, have no SLA, require attribution and caching, and prohibit bulk download/offline packs. A rendering library does not include a production tile service.

## Decision

Make the P0 nearby experience list-first and independent of map tiles. Obtain foreground location only after an explicit user action, provide manual city/barangay selection, store only the precision needed by the gig, and perform distance filtering in a parameterized SQL RPC using a bounded Haversine calculation, explicit authorization, and a fixed search path. Apply coarse latitude/longitude bounds and ordinary eligibility indexes before calculating exact distance. Remote gigs bypass distance filtering and are clearly labeled. Each result explains why it matched: distance band, remote status, category, skills, and schedule. PostGIS remains a measured optimization if the M06 query plan or data volume proves the simpler approach insufficient.

MapLibre React Native is an optional M11 enhancement after an Expo SDK 58 development-build spike. It may render only a source whose license, attribution, contest use, API-key/billing rules, cache policy, and availability are documented. Do not use Google Maps APIs. Do not add OSM Standard tile prefetch or offline packs. If no compliant, reliable, no-billing tile source is available, retain the list and optionally render a bundled/local schematic or GeoJSON view with required OpenStreetMap data attribution.

## Alternatives considered

- Google Maps SDK/API: rejected because enabling billing violates the project constraint.
- OSM Standard tiles as an offline/production CDN: rejected by the tile usage policy and reliability requirements.
- Self-hosted regional tile stack: deferred because operating it reliably exceeds the team's MVP capacity, even if the software is open source.
- PostGIS from day one: deferred because the MVP data set does not yet justify an extension; adopt it through a migration only after a query-plan benchmark.

## Consequences

- Core discovery remains reliable and fully usable without a map or tile-provider account.
- Exact home locations are unnecessary; use approximate gig locations and privacy-aware display.
- Map work cannot block the end-to-end marketplace flow.
- Any optional map provider is replaceable behind a map-source adapter and kill switch.

## Validation gates

- M06 tests distance ordering, radius filters, remote gigs, manual location, permission denial, and privacy-safe result fields.
- M11 documents the chosen source terms and verifies attribution, no billing method, quota behavior, Android rendering, failure fallback, and absence of prohibited prefetch.
