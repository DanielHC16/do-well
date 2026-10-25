# ADR 0007: Foreground location and list-first nearby discovery

- **Status:** Accepted
- **Date:** 2026-10-25
- **Decision owner:** Project team

## Context

Nearby gig discovery is a core value proposition of DO-WELL for local gig workers and community employers in Metro Manila. However, mobile location and map integration present two significant architectural hazards:
1. **Cost and Platform Boundaries:** Commercial map providers (e.g., Google Maps Platform SDK, Mapbox) require payment cards, billing activation, and risk per-tile or per-request overage fees, violating the hard-capped PHP 0 / USD 0 external service budget constraint. Public community raster tile services (e.g., `tile.openstreetmap.org`) explicitly prohibit high-concurrency mobile application map distribution, require strict user-agent attribution, provide no SLA, and prohibit offline tile prefetching.
2. **Privacy, Permissions, and Battery:** Continuous tracking, background location (`ACCESS_BACKGROUND_LOCATION`), or foreground tracking services consume battery and introduce user distrust. Furthermore, Android 12+ (API 31+) permits users to grant approximate location (`ACCESS_COARSE_LOCATION`) while denying fine location (`ACCESS_FINE_LOCATION`). Indoor environments, weak GPS reception, or outright permission denial must never break the ability to browse gigs or discover work.

## Decision

1. **Foreground-Only, One-Shot Location:**
   - Use `expo-location` strictly for one-shot foreground position queries triggered by user action ("Use my location").
   - Explicitly configure `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` in Android application manifests with user-facing purpose disclosure strings. Never request `ACCESS_BACKGROUND_LOCATION` or background execution services.
   - Request approximate / balanced accuracy with an explicit 5-second timeout.
   - Model permissions defensively through five distinct states: `undetermined`, `granted`, `denied`, `blocked` (permanently denied), and `services_disabled`.

2. **List-First Discovery as the Primary, Resilient Experience:**
   - Establish a distance-sorted noticeboard list as the verified primary discovery experience.
   - Distance calculation is performed server-side or via parameterized SQL RPC (`discover_gigs` with spherical Haversine formula) returning coarse distance bands (`< 5 km`, `< 15 km`) and explainable recommendation reasons.
   - Exact physical addresses and coordinates of employers remain strictly private under server-side RLS; only coarse `public_area` and truncated coordinates are returned to workers.

3. **Zero-Dependency Curated Locality Fallback:**
   - When GPS is unavailable, permission is denied, or the device is indoors, provide an instant manual locality picker populated with curated Metro Manila centroids (e.g., Makati CBD, Bonifacio Global City, Ortigas Center, Quezon City Diliman/Cubao, Manila Ermita, Alabang, etc.).
   - Reject real-time reverse-geocoding via public OSM Nominatim on mobile clients to avoid violating Nominatim's strict rate limits (1 req/sec) and terms of service.

4. **Map Experience Evaluation & Fallback:**
   - Interactive maps are classified as non-blocking optional overlays. MapLibre React Native was evaluated for vector rendering, but given the absence of a cardless, zero-cost, SLA-backed vector tile CDN, the production release default remains the zero-cost list-first architecture.
   - If an experimental map overlay is rendered in future builds, it must gracefully degrade to the list if tiles fail to load or connectivity drops.

## Consequences

### Positive
- Strict compliance with the PHP 0 / USD 0 external budget ceiling; zero card requirement, zero billing accounts.
- Complete privacy protection for employers and workers; approximate and coarse precision only.
- 100% resilient discovery flow: users who deny location or operate on devices without GPS can seamlessly select their locality and browse relevant gigs without interruption.
- Battery-friendly: no persistent background location listeners or wakelocks.

### Negative / Trade-offs
- No interactive panning/zooming map on the default screen; workers view gigs in a sorted list with distance chips and locality badges rather than pins on a map.
- Locality fallback is initially limited to Metro Manila pilot hubs and relies on curated centroid coordinates.

## Validation Gates
- Unit and component tests verifying all 5 permission states, manual locality switching, and distance sorting.
- Android permission disclosure strings verified in `app.config.ts`.
- End-to-end integration proving `discover_gigs` accepts worker coordinates and calculates accurate distances.
