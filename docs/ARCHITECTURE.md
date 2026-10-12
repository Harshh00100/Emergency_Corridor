# Architecture

## Folder structure

- `src/app`: application composition and providers
- `src/components`: reusable layout, feedback, and common controls
- `src/features/map`: Leaflet map, marker rendering, and map legend
- `src/features/routing`: OSRM workflow, route metrics, demo routes, and scoring
- `src/features/hospitals`: Overpass workflow and hospital selection
- `src/features/incidents`: simulated event controls, map event markers, and history
- `src/features/simulation`: ambulance timer and movement calculations
- `src/features/dashboard`: page-level control panels and disclosure content
- `src/features/scenarios`: versioned snapshots, import/export, local storage, share links, and recorded replay
- `src/offline`: service-worker template, injected with build-specific precache assets by Vite
- `src/services`: external HTTP services, endpoint configuration, and error types
- `src/state`: reducer actions, state transitions, and Context provider
- `src/config`, `src/constants`, `src/utils`: shared configuration, fixed values, and small cross-feature utilities

## Component responsibilities

`App.jsx` composes presentation components. `useDashboard` coordinates feature hooks, route selection, and recommendation-change notifications. Neither calls `fetch` or embeds scoring calculations. Map rendering is isolated in `MapView`. Route cards render scored candidates supplied by the route scoring module. Controls emit actions or callback intent and keep temporary form state local.

## Data flow

1. A dispatcher selects a point on the map or a hospital.
2. `AppStateContext` dispatches a location action to the reducer.
3. `useRoutePlanning` observes complete endpoints and calls `osrmApi`.
4. The service validates and transforms the response. On a permitted failure, the hook uses clearly labelled demo geometry.
5. `scoreRoutes` derives scored candidates from routes and current simulated incidents.
6. The map and route panels receive the same derived candidates and recommendation.
7. A map-placed event is stored in the reducer. The score is recalculated, a notification explains the change or stability, and the simulation panel can offer a route switch.
8. `useAmbulanceSimulation` owns the interval lifecycle and dispatches progress ticks. The reducer remains the source of truth for simulation status and progress.

## State management

Shared state is held in `AppStateContext` and updated only through `appReducer`. Source state includes locations, route responses, hospitals, incidents, simulation progress, notifications, and event history. Scored routes and the recommendation are derived with `useMemo`, so they are not duplicated in multiple state branches.

The provider timestamps actions at the boundary. The reducer is deterministic and bounds history to 40 events and notifications to five. Endpoint edits immediately clear old geometry and reset movement. The chosen route belongs to routing state, while the active movement route is pinned in simulation state until an explicit switch or reset. This prevents a recommendation recalculation from moving an ambulance onto a different route automatically.

The simulation ticks at 250 ms using elapsed monotonic time, capped at one second per tick after background tab suspension. Interpolation uses cached cumulative geodesic segment distances. Remaining time uses the configured speed, independently of scoring ETA. Switching is explicitly confirmed, resets to pickup, and pauses. Interval cleanup occurs on pause, reset, route change, and unmount. Memoized scoring and geometry avoid recomputation on movement ticks; the small prototype still uses one Context subscription boundary.

Asynchronous loading, success, error, and fallback source states are explicit. Route and hospital hooks use cancellation and request identity checks so older responses cannot overwrite a newer selection.

## Separation of business logic and UI

Route normalization, incident proximity, route scoring, explanations, hospital transformation, remaining distance, and ambulance position interpolation are plain JavaScript modules. React components render their inputs and emit user intent. Service modules are the only place that knows public endpoint formats.

## Adding a feature

1. Add a feature folder with components, hooks, and pure utilities where appropriate.
2. Define new shared transitions in `src/state/actionTypes.js` and `src/state/appReducer.js`.
3. Keep external access in a service module built on `requestJson`.
4. Add response validation and a user-facing error state.
5. Add a small feature component to the dashboard only after the domain logic is independently testable.
6. Update `README.md`, the relevant API documentation, and tests.

## Scenario lifecycle

`scenarioSerializer` is the validation boundary for storage, files, and URL fragments. It whitelists fields, validates coordinates/geometry, route references, progress and chronological replay frames, and bounds file/list sizes. A snapshot contains source state and recorded checkpoints; route rankings are derived again. `LOAD_SCENARIO` replaces the workspace atomically, clears gateway requests, pauses running movement, and increments `workspaceRevision` to cancel stale requests and clear temporary UI modes.

The reducer's `recordCheckpoint` wrapper records movement at roughly one-second intervals plus incident and simulation transitions. The latest 180 frames are retained. New route geometry resets the recording. `ScenarioReplay` owns a separate playback clock and uses these frames to render a read-only Leaflet map, recomputed recommendations, and the matching history. It never dispatches recorded network or gateway actions.

The provider hydrates localStorage before feature effects mount, autosaves on a fixed 1.5-second cadence, and flushes on pagehide/hidden visibility. A named snapshot uses a separate storage key. Restored successful route/place responses are retained until an explicit refresh or endpoint edit. Share links use gzip when available and URL-safe base64 in the fragment; the fragment is removed after loading so subsequent refreshes use current autosave.

The production-only offline worker precaches hashed JS/CSS, HTML, the manifest, and icons. Its cache version includes build and static content. It handles same-origin shell requests only, leaves external APIs/tiles to normal networking, and only deletes its own obsolete caches. Demo data is bundled in the app. No tile download or external API response caching is performed.
