# Testing

Run unit/integration tests with:

```bash
npm test
```

Use `npm run test:watch` while developing. Pure-logic tests run in Node; React integration tests use JSDOM and React Testing Library. Vitest service responses use mocked `fetch` and do not call OSRM or Overpass. Storage and URL state are reset between integration tests.

Run browser coverage with:

```bash
npx playwright install chromium
npm run test:browser
```

Playwright starts a production preview on port 4175. Tests cover snapshots, restore, import/export, compressed share-link loading, refresh recovery, playback and scrubbing with real Leaflet, focus return, offline reload through the production service worker, keyboard incident entry, route table access, and layout widths from 390 to 1440 px. Browser scenarios explicitly use bundled demo data. Failed tests retain traces under `test-results/`.

## Coverage areas

- Route metric normalization, route ranking, incident penalties, and recommendation explanations
- Invalid route payloads and invalid coordinates in the OSRM service
- HTTP errors, network errors, malformed JSON, timeouts, cancellation, and timer cleanup
- Overpass transformation, missing clinical fields, runtime error remarks, and empty results
- Configuration fallback warnings and explicit fallback disabling
- Unequal segment-length interpolation and speed-based remaining distance/time
- Reducer transitions for endpoints, incidents, route switches, notifications, and ambulance start, pause, resume, tick, and reset states
- Dashboard location mode and hospital selection interactions
- Full mocked-service dashboard flow: pickup, hospital, scoring, start, movement, pause, resume, blockage, changed recommendation, confirmed route switch, reset
- Visible sample-data fallback and retry controls
- Stale response suppression and explicit loading/error states
- Schema/version/file-size rejection, route references, timeline bounds, Unicode share links, and compression fallback
- Pagehide persistence, corrupt-storage recovery, and visible quota/write errors

Add tests for new pure business rules first. For components, test user-visible behavior and emitted actions rather than implementation details. External service responses should always be mocked.

The integration suite replaces only the Leaflet presentation layer to avoid relying on browser layout in JSDOM. All state, service, scoring, incident, and simulation code stays real. Native dialog open/close methods are shimmed for JSDOM; test keyboard focus and map behavior in a browser as part of the manual demonstration review.

## Manual browser review

- Follow the README demonstration with real Leaflet and public services. Check source labels after each request.
- Test desktop, tablet, and narrow mobile widths for readable controls and horizontal overflow.
- Navigate the coordinate form, hospital buttons, route cards, and simulation controls with a keyboard.
- Open project information and the route-switch confirmation; test Escape, focus trapping, and focus return.
- Block API and tile requests independently, then check fallback labels and retry behavior. Disable fallback in `.env` and repeat to check errors.
- Confirm a blockage can affect several routes without claiming an obstacle-free result.

On a Windows-mounted WSL filesystem, JSDOM module loading can be slower than on a native Linux filesystem. Tests use at most two workers and a 15-second individual test budget. Pure-logic tests avoid DOM setup; allow several minutes for a complete run in that environment. Chromium requires standard browser libraries; use Playwright's `install --with-deps chromium` on a fresh Linux CI host.

## Implementation review

The implementation was exercised in headless Chromium with real Leaflet and deterministic API fixtures: map clicks, hospital selection, route polylines, movement controls, blockage reranking, route switching, native dialogs, Escape, and keyboard focus containment. Desktop (1440 px), tablet (768 px), and mobile (390 px) layouts were checked for horizontal overflow. A separate network observation returned actual OSRM routes and OpenStreetMap tiles. Overpass was observed both timing out into the labelled fallback and returning external hospital records on a later request. Public availability is not a test dependency or a service guarantee.

The source-style audit found no prohibited icon library, fonts, gradients, white surface declarations, decorative hover motion, or em dash characters. Leaflet's built-in popup and control shadows are explicitly disabled in the application stylesheet. Modal and responsive screenshots were reviewed as part of the browser pass.
