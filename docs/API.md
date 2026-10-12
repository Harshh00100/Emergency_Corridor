# Public API integration

## OSRM

`src/services/api/osrmApi.js` calls the configured OSRM route endpoint with two coordinate pairs and requests full GeoJSON geometry plus alternatives. Responses are accepted only when the payload has `code: "Ok"`, at least one route, numeric distance and duration, and a LineString with usable coordinates.

The UI receives transformed route objects containing an internal id, distance in metres, duration in seconds, GeoJSON geometry, and source. Public route geometry and baseline estimates are external data. Simulated congestion and incident adjustments are local demonstration values.

## Overpass

`src/services/api/overpassApi.js` submits an Overpass query for `amenity=hospital` in an area around the selected pickup (or the configured default map center before pickup selection). Node and way or relation center coordinates are transformed into the same hospital shape. The UI offers a straight-line 2 km pickup-radius mode and a separate manual mode over the loaded search area. Only returned names and address tags are displayed. Missing fields are described as unavailable rather than fabricated. A payload with an Overpass runtime-error `remark` is rejected even when it includes an empty `elements` array. Successful empty results remain empty.

Overpass query text is constrained to a short alphanumeric search value. The UI reloads the hospital search area after pickup changes and filters the returned set locally for responsive selection.

The same service exposes `getTrafficSignals`, which requests mapped `node[highway=traffic_signals]` records within 2 km of the pickup. The nearest result is shown as the clearance target. If `VITE_SIGNAL_ALERT_URL` is blank, the clearance action is recorded as a local demo event. If configured, `signalAlertApi.js` sends a JSON request with an idempotency key and accepts only a response containing the same request id, target id, `status: "accepted"`, and a non-empty receipt id. Receipt acceptance confirms gateway receipt only; it does not claim a phase change or physical road clearance.

## Request handling

All requests use `requestJson` in `src/services/api/httpClient.js`. It applies an `AbortController` timeout, accepts an external cancellation signal, checks HTTP status, parses JSON, and throws `ApiError` with a stable code. Hooks convert errors into user-facing messages and prevent stale request results from updating state.

Relevant error codes include `TIMEOUT`, `ABORTED`, `NETWORK_ERROR`, `HTTP_ERROR`, `INVALID_JSON`, `INVALID_RESPONSE`, and `INVALID_COORDINATES`.

## Fallback behavior

When `VITE_ENABLE_DEMO_FALLBACK=true`, an external OSRM failure produces illustrative non-road-aligned geometry based on selected endpoints, and an Overpass failure produces sample hospital and traffic-signal lists. Invalid or nearly identical endpoints do not trigger a fallback. Both panels, the map, and the transparency section identify fallback data. When disabled, failures remain visible with retry controls. Sample hospital coordinates are approximate and include an explicitly illustrative Noida receiving facility. Sample signal locations cannot be delivered to a configured signal gateway. No sample emergency-status tags are supplied.

Map tiles are external requests managed by Leaflet. Tile failures show a separate retry control; no bundled offline basemap is claimed. The configured request timeout applies to JSON service requests, not Leaflet tiles. Hospital loading is tied to the configured default search area until a pickup is selected, then reloads around that pickup; it does not follow every pan or zoom, to limit public service load.

## Known public API limitations

OSRM and Overpass are public services with usage policies, rate limits, variable latency, and no service-level guarantee for this prototype. OSRM alternatives depend on the public router response. OpenStreetMap tags do not provide a reliable hospital capacity, emergency readiness, traffic-signal phase, or controller ownership feed. The optional signal gateway requires an approved backend integration, authentication, authorization, idempotency, audit logging, and operational monitoring before production use. No live traffic, accident detection, authentication, backend persistence, or autonomous dispatch integration is claimed.
