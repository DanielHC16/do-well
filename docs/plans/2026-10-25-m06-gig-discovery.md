# Milestone M06 Architecture and Execution Plan: Nearby and Remote Discovery

## 1. Context and Problem Statement
In Milestone M05, we built gig creation and employer management, allowing employers to draft, publish, and close gigs with server-enforced security-definer RPCs.
Milestone M06 provides the worker discovery experience:
Workers need an accessible, transparent, and explainable way to browse and filter published gigs without requiring an interactive map or device GPS permissions (foreground location permission is scheduled for M11). Discovery relies on worker profile locality (`home_area`) and optional coarse coordinates or manual area entry.

## 2. Hard Requirements & Constraints
1. **Zero External-Service Budget**: Hard ceiling of PHP 0 / USD 0. No paid geocoding APIs, map SDKs, or cloud services.
2. **Privacy Projection**: Never leak `gig_private_locations` (exact street address, building numbers, private instructions, or high-precision coordinates). Only coarse public projections (`public_area`, `public_latitude`, `public_longitude`) are returned.
3. **Status Filter**: Only `published` gigs may appear in the discovery feed. Draft, closed, cancelled, and completed gigs must never appear.
4. **Deterministic Explainable Ranking**: Reasons for recommendation chips (e.g. "Within 5 km", "Remote - work from anywhere", "In your neighborhood") must be deterministic, transparent, and never falsely labeled as AI.
5. **No Map Requirement**: All filtering, browsing, and sorting must be fully functional through accessible list views and filter chips.
6. **Graceful Fallbacks & Empty States**: Every async query must have explicit loading, empty, and error states.

## 3. Database Architecture & RPC Design
- Migration: `supabase/migrations/20261025000200_gig_discovery_rpcs.sql`
- Distance Function:
  \`public.calculate_distance_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric) returns numeric\`
  Calculates spherical great-circle distance in kilometers using the Haversine formula with clamped cosine to prevent floating point out-of-bounds.
- Discovery Function:
  \`public.discover_gigs(...) returns table (...)\`
  - Filters strictly by \`status = 'published'\`.
  - Filters by work mode (\`onsite\`, \`remote\`, \`hybrid\`).
  - Filters by category if specified.
  - Filters by max distance in km for onsite/hybrid gigs if coordinates are supplied.
  - Computes deterministic explanation tags:
    - \`remote\`: 'Remote - work from anywhere'
    - \`distance <= 5\`: 'Within 5 km of you'
    - \`distance <= 15\`: 'Within 15 km of you'
    - \`recent\`: 'Recently posted' (posted within 48 hours)
  - Orders by relevance: distance ascending (for nearby), published_at descending.
  - Hardened with \`set search_path = ''\` and security-definer execution with grant to \`authenticated\`.

## 4. Frontend & Route Integration
- Domain schemas: \`src/features/discovery/model/discovery-schemas.ts\` defining discovery filters, query input, and gig card projections with explanation tags.
- Gateway: \`src/features/discovery/data/discovery-gateway.ts\` calling \`discover_gigs\` RPC with lazy client initialization.
- Worker Noticeboard in \`src/features/shell/components/AuthenticatedHomeScreen.tsx\`:
  - When \`mode === 'worker'\`, replace static placeholder with live discovery feed.
  - Category filter pills horizontal scroll.
  - Mode toggle: All / Nearby / Remote.
  - Gig cards displaying category badge, title, compensation (PHP), area / remote tag, distance, and explainable chips.
- Worker Gig Detail Screen:
  - Route: \`app/(protected)/worker/gigs/[gigId].tsx\`
  - Component: \`src/features/discovery/screens/WorkerGigDetailScreen.tsx\`
  - Shows public gig details, instructions, compensation, coarse area, and "Apply for this gig (Coming in M07)" placeholder.

## 5. Test Strategy
1. **Database Tests (pgTAP)**: \`supabase/tests/080_gig_discovery_rpcs.test.sql\`
   - Proves draft and closed gigs are omitted.
   - Proves distance calculation accuracy.
   - Proves remote gigs appear without coordinates.
   - Proves distance cutoff excludes far gigs.
   - Proves explainable chips match data.
2. **Gateway & Schema Unit Tests**:
   - \`src/features/discovery/model/__tests__/discovery-schemas.test.ts\`
   - \`src/features/discovery/data/__tests__/discovery-gateway.test.ts\`
3. **Component & Route Tests**:
   - \`src/features/discovery/screens/__tests__/WorkerGigDetailScreen.test.tsx\`
   - Updated \`AuthenticatedHomeScreen.test.tsx\` for worker discovery feed.
   - Updated \`routes.test.tsx\` for \`worker/gigs/[gigId]\`.
4. **Quality Pipeline**:
   - \`npm run db:lint\`, \`npm run db:test\`, \`npm run db:types:check\`
   - \`npm run format:check\`, \`npm run lint\`, \`npm run typecheck\`, \`npm run test:run\`
   - \`npx expo-doctor\`
