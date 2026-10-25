# Milestone M11: Android Foreground Location & Map Decision Implementation Plan

> **Goal:** Enhance worker gig discovery with permission-aware foreground device positioning and zero-dependency manual locality selection, while formally documenting the list-first map decision at zero external spend (PHP 0 / USD 0).

**Architecture:**
- Native Android location permissions (`ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`) declared in `app.config.ts` with explicit user-facing purpose descriptions.
- Testable adapter pattern (`LocationService`) wrapping `expo-location` with balanced accuracy, a strict 5-second timeout, and defensive permission state modeling (`undetermined`, `granted`, `denied`, `blocked`, `services_disabled`).
- Curated Metro Manila locality directory (`METRO_MANILA_LOCALITIES`) providing instant centroid coordinates (Makati CBD, Taguig BGC, Ortigas Pasig, QC Cubao/Diliman, Manila Ermita, Alabang, etc.) without hitting rate-limited geocoding APIs.
- Worker discovery integration in `AuthenticatedHomeScreen`:
  - Location selection bar indicating active search center (Device GPS or Selected Locality) and distance radius.
  - Interactive Location Selector modal for requesting current GPS fix, switching localities, or toggling search radius.
  - Feeding coordinates into `discovery.discoverGigs({ workerLatitude, workerLongitude, filters })` to compute spherical Haversine distances, enable distance sorting, and surface explainable proximity badges (`Within 5 km of you`).

**Tech Stack:**
- React Native / Expo SDK 58 New Architecture
- `expo-location` (~58.0.19)
- Zod schema validation
- TypeScript strict mode
- Jest 30 / React Native Testing Library 14+

---

## 1. Domain & Contracts (`src/features/location/model/location-schemas.ts`)

### Schemas:
1. `LocationCoordinatesSchema`:
   - `latitude`: number (-90 to 90)
   - `longitude`: number (-180 to 180)
   - `accuracy`: number nullable
   - `timestamp`: number
2. `LocationPermissionState`:
   - Enum: `"undetermined" | "granted" | "denied" | "blocked" | "services_disabled"`
3. `LocalityOptionSchema`:
   - `id`: string (slug)
   - `name`: string (e.g. "Makati CBD")
   - `region`: string (e.g. "Metro Manila")
   - `latitude`: number
   - `longitude`: number
4. `LocationSelectionSchema`:
   - `type`: `"gps" | "locality"`
   - `coordinates`: `LocationCoordinatesSchema`
   - `label`: string (e.g. "Current location" or "Makati CBD")
   - `updatedAt`: number

### Curated Localities:
- Makati CBD (14.5547, 121.0244)
- BGC Taguig (14.5492, 121.0509)
- Ortigas Pasig (14.5869, 121.0614)
- Cubao Quezon City (14.6195, 121.0536)
- Diliman Quezon City (14.6538, 121.0685)
- Ermita Manila (14.5833, 120.9794)
- Alabang Muntinlupa (14.4258, 121.0361)
- Mandaluyong Greenfield (14.5794, 121.0538)
- Pasay Mall of Asia (14.5353, 120.9829)

---

## 2. Location Service Adapter (`src/features/location/data/location-service.ts`)

- `LocationService` interface:
  - `checkPermission(): Promise<LocationPermissionState>`
  - `requestPermission(): Promise<LocationPermissionState>`
  - `getCurrentPosition(timeoutMs?: number): Promise<LocationCoordinates>`
  - `isLocationServicesEnabled(): Promise<boolean>`
- Default implementation using `expo-location`:
  - `Location.getForegroundPermissionsAsync()`
  - `Location.requestForegroundPermissionsAsync()`
  - `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })` wrapped with `Promise.race` against `timeoutMs` (5000ms default)
  - Defensive error handling: maps permission denied, timeout, and disabled services to typed application states without crashing.

---

## 3. UI Components (`src/features/location/components/`)

1. `LocationBar.tsx`:
   - Renders current location badge: e.g. "📍 Makati CBD (Within 10 km)" or "📍 Current Location".
   - Tap opens `LocationSelectorModal`.
2. `LocationSelectorModal.tsx`:
   - Modal with clean typography and accessible targets.
   - Action: "Use Current GPS Location" with permission handling and progress indicator.
   - Section: Distance Radius Selector (Any, 5 km, 10 km, 25 km).
   - Section: Curated Metro Manila locality list for instant zero-GPS fallback.
   - Permission denial / service disabled alert box offering manual locality choice.

---

## 4. Integration into Authenticated Noticeboard

- Connect `LocationSelectorBar` into `AuthenticatedHomeScreen.tsx` when `mode === "worker"`.
- Pass `workerLatitude`, `workerLongitude`, and `maxDistanceKm` to `discoveryGateway.discoverGigs(...)`.
- Display computed distance and explainable proximity badges on `DiscoveryGigCard`.

---

## 5. Verification Plan

1. **Schemas & Localities Tests:**
   - Coordinate validation (range -90..90, -180..180).
   - Locality selection validation and fallback retrieval.
2. **Location Service Tests:**
   - Mocks for `expo-location` checking permission resolution (`granted`, `denied`, `blocked`, `services_disabled`).
   - Timeout handling test.
   - Successful position acquisition test.
3. **UI Component Tests:**
   - LocationBar rendering active location and tapping to open modal.
   - LocationSelectorModal: requesting GPS, selecting radius, selecting locality, displaying denial note.
4. **End-to-End Noticeboard Integration:**
   - Full discovery lifecycle with coordinates and distance filtering.
5. **Project Quality Checks:**
   - `npm run format:check`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
   - `npx expo-doctor`
