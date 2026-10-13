# AI Emergency Corridor

AI Emergency Corridor is a frontend-only design thinking prototype for comparing ambulance driving corridors and reconsidering a recommendation after a simulated road event. It is intended for a third-year Electronics and Telecommunication Engineering demonstration. It is not intended for real emergency dispatch decisions.

## Scope and features

- Interactive Leaflet map centered on Delhi NCR
- Map-click pickup and destination selection
- OpenStreetMap hospital points through Overpass, with visibly labelled sample fallback data
- OSRM driving routes and alternatives, with demo geometry fallback for disconnected demonstrations
- Normalized route scoring across adjusted travel time, distance, simulated congestion, and simulated incident impact
- Manual simulated blockage, accident, and congestion events
- Route recommendation explanations and route-switch suggestions
- Timer-based ambulance movement with start, pause, resume, reset, and speed controls
- Session event history, notifications, data-source disclosure, and design thinking project information
- React Context and `useReducer` shared state with isolated service and business-logic modules
- Automatic refresh recovery, a named snapshot, validated JSON import/export, and shareable scenario links
- Recorded timeline replay with scrubbing, playback speeds, incident changes, and route recommendations
- Installable application shell, explicit offline demo mode, and connection status
- Keyboard incident entry, accessible route comparison table, and dialog focus restoration

## Technology stack

React, Vite, JavaScript ES modules, Leaflet, React Leaflet, OpenStreetMap tiles, OSRM, Overpass, Vitest, and React Testing Library. Styling is modular CSS with centralized variables. No backend or database is required.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- Network access is useful for OpenStreetMap tiles, OSRM, and Overpass. The application can use visible demo fallbacks when configured.

## Installation

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite. Public services can be slow or rate limited. A first map view can still be demonstrated with the fallback enabled.

The `.env` copy is optional: validated public defaults work without it. On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. After the first installation, `npm ci` uses the supplied lockfile for repeatable installs.

## Streamlit version

A native Python dashboard is available in `streamlit_app.py`. It supports coordinate-based route planning and comparison, weighted route recommendations, simulated road events, nearby hospital search, and an interactive map. It uses public OSRM and OpenStreetMap services; route estimates, congestion, and events are for demonstration only.

Install Python dependencies and start the app from the project folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m streamlit run streamlit_app.py
```

To publish with Streamlit Community Cloud, connect the GitHub repository, set `streamlit_app.py` as the app file, and keep `requirements.txt` in the repository root. The existing React/Vite app remains available separately through `npm run dev`.

## Five-minute demonstration

1. Click the map to set pickup. Choose a hospital or click again to set destination. A keyboard coordinate form is available under Dispatch setup.
2. Wait for routes. Check the source disclosure before describing the result. OSRM can return just one candidate.
3. Compare baseline and adjusted times, route distance, congestion, and normalized cost. Select a route, then use **Start movement**.
4. Use **Pause** and **Resume**. Change speed to see the remaining-time estimate respond.
5. Use **Simulate blockage on recommended corridor**, or place an event directly on the map. Review the decision in the history. Shared road segments may affect several routes, so a switch is not guaranteed. A blockage also requests and displays fresh alternate routes from the reported location to the selected destination.
6. If a different route is recommended, choose **Switch to recommendation**. The confirmation explains that switching restarts at pickup and pauses. This prototype does not compute a connector from the current ambulance position.
7. Use **Reset** and review the Design Thinking project panel.

If an external route request fails, the fallback paths are illustrative and are **not road-aligned**. Offline map tiles are not bundled; a tile-error notice and retry control are shown if needed. For a repeatable offline demonstration, browser network blocking of OSRM and Overpass exercises this labelled fallback workflow.

## Environment configuration

Copy `.env.example` to `.env` and adjust public configuration if needed:

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_OSRM_BASE_URL` | OSRM public base URL | `https://router.project-osrm.org` |
| `VITE_OVERPASS_API_URL` | Overpass interpreter endpoint | `https://overpass-api.de/api/interpreter` |
| `VITE_DEFAULT_MAP_LAT` | Initial latitude | `28.6139` |
| `VITE_DEFAULT_MAP_LNG` | Initial longitude | `77.2090` |
| `VITE_DEFAULT_MAP_ZOOM` | Initial zoom | `11` |
| `VITE_REQUEST_TIMEOUT_MS` | Browser request timeout | `8000` |
| `VITE_ENABLE_DEMO_FALLBACK` | Permit labelled local fallback data | `true` |

Do not place private keys or secrets in `VITE_*` variables. Vite exposes them to the browser.

## Commands

```bash
npm run dev             # Development server
npm run build           # Production build
npm run preview         # Serve the production build locally
npm run lint            # ESLint checks
npm test                # Vitest single run
npm run test:watch      # Vitest watch mode
npm run test:browser    # Build and run Chromium browser tests
```

Install the browser once with `npx playwright install chromium`. Linux CI can use `npx playwright install --with-deps chromium`.

## Saving, sharing, and replaying a scenario

Use **Save and replay scenario** at the top of the dispatch controls:

1. Name the scenario and configure endpoints, routes, events, and movement.
2. The current workspace is autosaved every 1.5 seconds and when the page is hidden or unloaded. Refresh restores saved geometry and progress; running movement restores paused.
3. **Save snapshot** keeps one named copy separately from autosave. **Restore** returns to that snapshot. **New** clears the workspace while retaining the named copy.
4. **Export JSON** downloads the full versioned scenario. **Import JSON** validates a file before replacing the workspace. **Export summary** downloads route metrics, the recommendation, progress, and the chronological event history.
5. **Copy share link** encodes the complete snapshot and recording in a compressed URL fragment. No scenario backend is needed. If clipboard access is unavailable, copy from the displayed link field. Large scenarios should be shared as JSON files instead.
6. **Replay recording** opens a separate review map and pauses current movement. Use Play/Pause, Rewind, the keyboard-accessible timeline, and 1×/4×/16× speeds to review movement, incident changes, and recommendations.

The recording keeps the latest 180 checkpoints, sampled about once per second during movement and at significant changes. Changing endpoints or requesting new route geometry starts a new recording. Event history retains the latest 40 events. Replay uses the saved candidates and scoring algorithm without requesting new routes. Imported files are limited to 2 MB, bounded geometry and list sizes, and schema version 1. Unsupported or corrupt data produces a visible error. Gateway receipts are not restored as current requests.

Scenarios are stored under `emergency-corridor.autosave.v1` and `emergency-corridor.saved.v1` in localStorage. Exported files and share links contain the coordinates and recorded scenario. Clearing the site's browser data removes local copies. Storage failure is shown in the panel; JSON export remains available.

## Offline application

Build and serve the production app with `npm run build` followed by `npm run preview`. After the first successful connected visit, the service worker precaches the application, icons, and bundled demo data. The browser's install option is available where supported. Service workers require HTTPS or localhost and are disabled in the Vite development server.

Enable **Offline demo mode** to use bundled sample routes, hospitals, and signals for new requests immediately. Existing saved routes remain intact. Offline reload, movement, and recorded replay work with the cached application shell. External OpenStreetMap tiles are not cached; offline demo mode shows routes and markers on a plain background. New API requests also use sample data when the browser reports that it is offline. The header reports network connectivity separately from the demo-mode toggle.

## Route scoring

The scoring implementation is in `src/features/routing/utils/routeScoring.js`. Metrics are normalized over the current route candidates, with lower values preferred:

```text
cost = 0.45 * normalized(adjusted travel time)
     + 0.20 * normalized(route distance)
     + 0.20 * normalized(simulated congestion)
     + 0.15 * normalized(simulated incident impact)
```

Normalization is `(value - min) / (max - min)` over the available candidates. An equal-valued metric contributes zero. Custom non-negative weights are divided by their total, so costs remain in the 0 to 1 range. A score of zero means best relative cost in this candidate set, not zero risk or a probability of success.

The adjusted travel estimate is `baselineSeconds * (1 + 0.75 * congestion + incidentPenalty)`. Route distance is never inflated: it remains the source distance. Congestion is a deterministic, index-based demonstration value unless supplied by sample routes. Event penalties depend on the shortest point-to-segment distance inside the configured radius, with a proximity multiplier `max(0.15, 1 - distance/radius)`. Congestion-event penalties are capped at 0.8, incident penalties at 0.9, and total congestion at 0.95. Weights and severity penalties live in `src/constants/scoring.js`.

The route with the lowest cost is ranked first. A blockage is a soft penalty in the original candidate set, not a road-network closure constraint. Candidates are reranked locally, while a separate OSRM request supplies alternate geometry beginning at the reported blockage. This is a transparent heuristic, not a trained AI model or live traffic prediction.

## Troubleshooting public API failures

- If routes fail, check the browser network connection and the OSRM endpoint. With `VITE_ENABLE_DEMO_FALLBACK=true`, the route panel will identify demo geometry.
- If hospitals fail, the panel will identify sample hospital data. Sample records do not represent live hospital capacity or emergency department availability.
- Public services may rate limit repeated requests. Wait briefly, use the retry control, or continue with the labelled fallback.
- If the map is blank, verify that Leaflet CSS is imported and that tile requests are not blocked by a network policy.

## Windows / WSL native dependency errors

Rollup and esbuild install operating-system-specific binaries. Installing dependencies in WSL and then starting the same folder with Windows Node can leave Windows binaries missing, including `@rollup/rollup-win32-x64-msvc`.

From **Windows PowerShell**, repair the installation with:

```powershell
Set-Location "D:\Users\Harsh Kumar\D-Downloads\dtk_c"
npm install --include=optional
npm run dev
```

Run installation and development commands in the same environment. If you work in both Windows and WSL, use separate project copies with their own `node_modules`. If repair still fails, stop running development servers and use `npm ci --include=optional` in the intended environment to recreate dependencies from the existing lockfile.

## Project structure

Feature folders live under `src/features`, API access is under `src/services`, shared state is under `src/state`, reusable presentation components are under `src/components`, and application composition is under `src/app`. See `docs/ARCHITECTURE.md` for the data flow and extension points.

## Transparency and legal placeholders

The app visibly distinguishes OpenStreetMap and OSRM responses from sample fallback data and local simulation. The footer links point to Terms of Service and Privacy Policy placeholder sections. They identify external location requests and the need for owner-supplied deployment terms, without presenting invented legal claims.
