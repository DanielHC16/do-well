# Android Integrations

## Decision status

- **Confirmed:** Android is the competition target; development builds and at least one physical Android device are required.
- **Confirmed:** nearby discovery must work without Google Maps or any billing-enabled map API.
- **Confirmed:** P0 uses foreground location only, supports manual location, selects image evidence with least privilege, and starts with local notifications.
- **Proposed:** use Expo SDK 58 and add MapLibre only after the list experience is complete and an approved tile source is recorded in an ADR.

## Nearby discovery: map-independent baseline

The P0 experience is a distance-sorted list. It is a complete product path, not a degraded map screen:

1. Ask for foreground location only when the user selects **Use my location**.
2. Accept approximate location and show the effective locality/radius.
3. Fall back to a manually selected city/locality when permission is denied, location services are disabled, a fix times out, or the device is indoors.
4. Send a bounded search center and radius to a server query; return only published gigs and a rounded distance/recommendation reason.
5. Never expose an employer's precise private address in discovery results.

This requires no map tiles, map API key, geocoder, or billing account. P0 distance calculation uses the reviewed bounded Haversine SQL query described in the database architecture; PostGIS is optional only after M06 query-plan evidence. The client renders the result and must not be trusted to enforce visibility.

Reading the phone's location through Android/`expo-location` is separate from displaying Google Maps and does not require a Google Maps Platform key or billing account.

`expo-location` supports foreground permission and one-time position requests. It adds coarse and fine location permissions by default, but Android recommends approximate location where it is sufficient; Android 12+ users may grant approximate access even when fine access is requested ([Expo Location SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/location/), [Android location permissions](https://developer.android.com/develop/sensors-and-location/location/permissions/runtime)). For this app:

- request reduced/approximate accuracy first;
- do not enable `ACCESS_BACKGROUND_LOCATION`, a location foreground service, or continuous tracking;
- set a short user-visible timeout and offer manual entry instead of repeatedly prompting;
- persist only the user-approved locality and coordinates needed for matching;
- round coordinates shown to other users and keep any work address private.

Do not build autocomplete or bulk geocoding against the public OSM Nominatim endpoint. Its public service has an absolute one-request-per-second application limit, forbids client-side autocomplete, requires identification and attribution, and may withdraw access ([Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)). A curated locality list plus device coordinates is the zero-dependency P0 choice.

## Interactive map decision

| Option | Cost and policy | Expo/Android fit | Decision |
|---|---|---|---|
| No interactive map | No external map cost or availability dependency | Works in all builds | **P0 default** |
| MapLibre React Native with an approved vector/raster source | Renderer is open source; tile data/hosting has separate terms | Expo config plugin; requires a rebuilt development client, not Expo Go | **Feasibility option after M06** |
| Public `tile.openstreetmap.org` raster tiles | Best effort, no SLA; strict identification, caching, attribution, and no-prefetch rules | Technically renderable, but fragile as an application dependency | **Do not use as the release default** |
| Paid or billing-enabled Google Maps | Violates the hard cost gate | Not evaluated further | **Prohibited** |

MapLibre React Native supports Expo and Android, wraps MapLibre Native, requires React Native 0.80+ and Android API 23+, and from v11 requires React Native's new architecture. Its documentation explicitly says production applications must provide their own tiles/style, and the Expo integration requires a config plugin and a native rebuild ([getting started](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/), [Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/)). The wrapper is MIT-licensed ([license](https://github.com/maplibre/maplibre-react-native/blob/main/LICENSE.md)). A renderer license is not a tile license or hosting promise.

If a map is approved, its ADR must record all of the following before code is merged:

- provider and exact style/tile URLs;
- current terms, quota, whether a card is required, and whether overage is impossible;
- contest/demo and future commercial-use permission;
- attribution text and placement;
- cache and offline/prefetch permission;
- API-key restrictions, if any;
- outage behavior that returns to the list without blocking discovery;
- a named owner and policy re-check date.

OpenStreetMap data is ODbL-licensed and requires attribution and license notice ([OSM copyright and license](https://www.openstreetmap.org/copyright)). The community raster service is not an unrestricted CDN. It requires the exact HTTPS URL, visible attribution, an identifiable application user agent, compliant caching, and prohibits bulk download, prefetch, and offline map packs; it may block clients without notice ([OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/)). If used only for a controlled feasibility test, requests must follow that policy and the app must remain fully usable when tiles fail.

Bundled or self-hosted tiles are not automatically free: the data extract, style, fonts, storage, distribution size, and each upstream license still require review. Do not claim offline maps until a real device can render a legally redistributable bundle without network access.

## Image evidence

Use `expo-image-picker` for P0 library selection and optional system-camera capture. It is available in Expo development builds and provides the system picker ([Expo ImagePicker SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/)). Configure the plugin with `microphonePermission: false`; otherwise it adds Android `RECORD_AUDIO` by default even though Do Well does not record audio.

Implementation rules:

- ask only when the user taps an evidence action;
- accept images only; do not request EXIF data;
- validate MIME type, byte size, extension, and decoded dimensions before upload;
- generate a bounded upload variant and remove unneeded metadata;
- copy a pending image to app-controlled storage before relying on it for a retry;
- upload to a private Supabase Storage bucket using a user-scoped object path and RLS;
- use short-lived signed URLs for display; never make evidence buckets public;
- show separate `selected`, `uploading`, `failed`, `uploaded`, and `attached` states;
- delete or retain evidence only according to the later approved retention policy.

Image selection succeeding does not mean upload succeeded. Before upload, `begin_submission` must reserve the version and authorized private path with an idempotency key. The app uploads only under that reservation, and `finalize_submission` references verified private objects and advances work state atomically. Neither selection nor upload alone is reported as submission success.

## Notifications

### P0: activity center plus local notifications

`expo-notifications` supports local and remote notifications. Local notifications are scheduled by the application and do not prove that a server can reach a closed device ([Expo notification concepts](https://docs.expo.dev/push-notifications/what-you-need-to-know/)). P0 should:

- keep the in-app activity center as the source of truth;
- create named Android notification channels;
- request `POST_NOTIFICATIONS` in context on Android 13+;
- schedule local notifications only for events the device already knows about;
- deep-link a tap to an authorized screen and re-fetch current server state;
- behave normally when notification permission is denied.

Android 13+ requires the runtime notification permission before ordinary notifications are shown ([Android notification permission](https://developer.android.com/develop/ui/views/notifications/time-sensitive)). Do not present local notifications as remote push evidence.

### Optional: genuine remote push

Remote push is a later zero-cost enhancement. Firebase Cloud Messaging is listed as a no-cost Firebase product, including for production use; the Spark plan needs no payment information ([Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firebase pricing](https://firebase.google.com/pricing)). Expo's push service is also free and limits projects to 600 notifications per second ([Expo push FAQ](https://docs.expo.dev/push-notifications/faq/)).

The path still adds operational work:

1. create a Firebase Spark project without a billing account;
2. register the final Android package;
3. configure `google-services.json` (public identifiers) and an FCM v1 service-account key (secret);
4. store the service-account key outside Git and upload it only through approved credential tooling;
5. build a development client; remote push is unavailable in Expo Go from SDK 53 onward;
6. store rotating device tokens per user/device and remove tokens reported as unregistered;
7. send from a trusted server path after the business transaction commits.

Expo documents the FCM v1 credential flow and explicitly requires the service-account JSON to remain ignored ([FCM v1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials/)). If any Firebase screen requests a Blaze upgrade or billing link, stop: that path is outside the approved budget.

## Physical-device verification

Record the phone model, Android version/API, build identifier, tester, and timestamp in the milestone evidence. At minimum test:

| Area | Required checks |
|---|---|
| Installation | Clean install of the development APK; launch with Metro and once with Metro unavailable |
| Permissions | First grant, approximate grant, denial, permanent denial/settings recovery, and permission revoked after use |
| Location | Outdoors/indoors, services disabled, slow fix, stale last-known fix, and manual-locality fallback |
| Map, if present | Tiles unavailable, attribution visible, list fallback, cache policy, and no background prefetch |
| Image | Select, cancel, oversized/unsupported input, process death after selection, upload interruption, retry, and private retrieval |
| Notifications | Permission grant/deny, channel behavior, foreground/background/terminated delivery, tap routing, and stale payload revalidation |
| Connectivity | Run the matrix in `OFFLINE_STRATEGY.md` on Wi-Fi, throttled data, airplane mode, and reconnect |

An emulator is useful for API-level coverage, but it does not replace the required physical-device pass.
