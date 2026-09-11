# NIRNYAY

Mission-aware disruption response for essential logistics in the North Eastern Region (SIH26002, Round-1 prototype).

One landslide. Three missions. Different decisions.

NIRNYAY takes a field report of a road disruption, helps an officer understand and verify it, updates the road network, and works out — per mission and per vehicle — whether each shipment should continue, reroute or hold. The demo reconstructs the September 2024 NH-29 disruption between Dimapur and Kohima (Nagaland).

> **Prototype disclosure.** This Round-1 prototype uses reconstructed scenario data, seeded data and simulated external feeds. It is not an official record of the historical incident, and no government, weather or logistics API is connected. Simulated sources are labelled SIMULATED / DEMO DATA wherever they appear.

## The story

```
DETECT      field report arrives (photo + GPS + time)
UNDERSTAND  AI-assisted analysis + multi-source corroboration
VERIFY      an authorized officer verifies the incident
RESPOND     network change → missions affected → route feasibility → decisions
AUTHORIZE   approving authority → driver instruction
REASSESS    second disruption → earlier decision superseded → re-evaluation
```

Scenario:

| Mission | Cargo | Vehicle | After I-001 (NH-29 blocked) | After I-002 (Route C blocked) |
|---|---|---|---|---|
| M-101 | Critical medicines | 16-wheel HCV | HOLD + VERIFY / ESCALATE | HOLD + VERIFY / ESCALATE |
| M-102 | Relief food | Medium truck | HOLD + VERIFY / ESCALATE | HOLD + VERIFY / ESCALATE |
| M-103 | Construction material | LMV | REROUTE via Route C | superseded → HOLD + VERIFY / ESCALATE |

Route A is the original NH-29, Route B (Pimla–Mhainamtsi) is high-risk with stale evidence, and Route C (Niuland–Kohima bypass) is LMV-only.

Responsibilities are kept separate on purpose:

- **AI** — assistive analysis only; it never verifies an incident or overrides a constraint
- **Officer** — official verification
- **Engine** — deterministic route feasibility (hard constraints are checked before anything is ranked)
- **Authority** — authorization; a recommendation is not an order

## Running locally

Requires Node.js 20.11 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- `/` — public home page
- `/field/report` — field reporter (works offline; reports are stored on the device in IndexedDB)
- `/login` — prototype officer sign-in (choose the *Approving authority* role to approve decisions)
- `/dashboard` — Command Center
- `/demo` — same portal with the presentation control enabled

### Presenting the demo

1. Go to `/login`, enter a name, choose **Approving authority**, and enter the portal.
2. Open `/demo`.
3. Use the small **Presenter** control (bottom right): *Start demo*, then *Next* through the six stages. *Reset demo* returns to the normal state at any time.

Once a demo run is started, a report submitted from `/field/report` in the same browser is picked up automatically by a local event bridge: the incident is created from the real stored report (photo included), the AI analysis runs and the simulated context evidence is attached, leaving the incident ready for officer verification. The bridge is local to the browser — it is not a server upload, and it never verifies an incident.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest unit tests (scenario, AI layer, incident intelligence) |

`predev` / `prebuild` copy the MapLibre worker into `public/maplibre/` (it is git-ignored and regenerated on every build).

## Configuration

Everything works without configuration. Optional build-time variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIELD_REPORT_ENDPOINT` | endpoint that receives queued field reports (multipart upload with an `Idempotency-Key`) |
| `NEXT_PUBLIC_AI_INTERPRETATION_ENDPOINT` | backend adapter for LLM-based evidence interpretation; without it a deterministic fallback runs in the browser |
| `NEXT_PUBLIC_MAPTILER_KEY` | optional MapTiler key for a cleaner vector basemap under the corridor; without it the map uses OpenStreetMap raster tiles |

Secret API keys never go in the browser — the AI endpoint is expected to be your own backend that holds them. The MapTiler key is a public browser key by design; restrict it to your deployment domain in the MapTiler dashboard.

## Deploying

The app is a standard Next.js project with no server-side dependencies.

- **Vercel:** import the repository; the default settings work (`npm run build`, output handled by Next.js).
- **Any Node host:** `npm ci && npm run build && npm start` (set `PORT` to change the port).

The operational map loads MapTiler vector tiles (when a key is set) or OpenStreetMap tiles; without internet the corridor, markers and route states still render on a plain background.

## Project layout

```
app/                  routes — (public) site + field reporter, (portal) officer portal
components/home       public home page
components/field      field reporting flow
components/portal     Command Center, map, AI panels, decision views
lib/field             offline queue (Dexie), photo handling, sync
lib/scenario          event log, reducer, commands, deterministic engine, presenter steps, report builder
lib/ai                AI provider interface, deterministic fallback, response synthesis
tests/                Vitest suites
```

Portal state is an append-only event log in IndexedDB; every screen is derived from it, and every action appears in the audit trail.
