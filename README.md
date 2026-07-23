# TransLink Digital Twin — Metro Vancouver

A real-time 3D digital twin of Metro Vancouver's TransLink network. Live bus, SkyTrain, and SeaBus positions are rendered on a hardware-accelerated WebGL/WebGPU-class map, fused with corridor speed data and historical ridership baselines to power predictive delay forecasts, crowd density visualization, and AI-generated disruption summaries.

Built with **Next.js 14 (App Router)**, **deck.gl**, and **MapLibre GL**. Runs fully-featured with zero configuration using deterministic mock data generators, and upgrades to live TransLink/Anthropic data the moment API keys are provided.

## Features

1. **3D Digital Twin Map** — deck.gl `IconLayer` / `PathLayer` / `ColumnLayer` over a dark MapLibre GL basemap, with elevated SkyTrain guideway rendering, SeaBus water vectors, and 60fps client-side interpolation between GTFS-RT position pings.
2. **Real-Time Crowd Density Heatmaps** — vehicle occupancy estimated from GTFS-RT occupancy status (live) or a time-of-day/TSPR-informed model (mock), rendered as color-coded density halos.
3. **Predictive Cascading Delay Engine** (`lib/delayPredictor.ts`) — cross-references RTDS corridor speed drops against live vehicle positions to forecast arrival delays 15–30 minutes ahead of official GTFS-RT delay fields.
4. **Multimodal Corridor Fusion** — visual transfer vectors between key hubs (Waterfront, Commercial-Broadway, Lougheed Town Centre, Metrotown, Lonsdale Quay, Coquitlam Central) across Bus/SkyTrain/SeaBus.
5. **Generative AI Disruption Summarizer** (`/api/ai/summarize-alerts`) — turns cryptic GTFS-RT service alert text into plain-English rider guidance via the Anthropic Claude API, with a deterministic rule-based fallback when no API key is set.
6. **Corridor Bottleneck Diagnostics** — flags corridors (Broadway, 41st Ave, Hastings, Highway 1, Kingsway, Marine Drive) where speeds drop below 30–55% of free-flow.

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn-style UI primitives, Framer Motion, Lucide Icons, Recharts
- **Spatial rendering:** `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/geo-layers`, `@deck.gl/react`, `@deck.gl/mapbox`, `maplibre-gl`
- **Data ingestion:** `gtfs-realtime-bindings`, `protobufjs`
- **AI:** `@anthropic-ai/sdk`

## Project Structure

```
app/
  page.tsx                                 Main dashboard UI
  api/translink/gtfs-rt/route.ts           Live vehicle positions + alerts (protobuf → JSON)
  api/translink/rtds/route.ts              Corridor speed + bottleneck data
  api/translink/tspr/route.ts              Historical ridership baselines
  api/ai/summarize-alerts/route.ts         AI disruption summarizer
components/
  map/TransitMap3D.tsx                     deck.gl + MapLibre 3D canvas
  ui/Header.tsx, ControlPanel.tsx, DisruptionBanner.tsx, AnalyticsDrawer.tsx, NodeDrawer.tsx
lib/
  translink.ts                             API client, caching, mock data generators
  delayPredictor.ts                        Cascading delay engine + bottleneck detection
  aiSummarizer.ts                          Claude-powered / rule-based alert summarizer
  metroVancouverData.ts                    Reference geometry (routes, corridors, hubs)
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs entirely on realistic mock data out of the box — no API keys required.

### Enabling live data

Copy `.env.example` to `.env.local` and fill in:

- `TRANSLINK_API_KEY` — from the [TransLink Developer Portal](https://developer.translink.ca), enables live GTFS-RT vehicle positions and service alerts.
- `TRANSLINK_RTDS_URL` / `TRANSLINK_TSPR_URL` — optional, if you have direct access to TransLink's RTDS/TSPR datasets.
- `ANTHROPIC_API_KEY` — enables Claude-powered plain-English disruption summaries (falls back to a rule-based summarizer otherwise).

Every data-fetching function in `lib/translink.ts` fails soft: if a live request errors or a key is missing, it transparently falls back to the mock generator so the app never breaks in production.

## Deploying to Vercel

```bash
npm install -g vercel   # if you don't already have the CLI
vercel login
vercel --prod
```

Or connect the GitHub repository directly in the [Vercel dashboard](https://vercel.com/new) — `vercel.json` and `next.config.js` are already configured with the correct headers, CORS, and `transpilePackages` for deck.gl's ESM packages. All API routes are serverless functions with `Cache-Control` tuned per data source (`s-maxage=10` for live vehicle positions, `s-maxage=30` for corridor speeds/alerts, `s-maxage=3600` for ridership baselines).

Set the same environment variables from `.env.example` in your Vercel project's **Settings → Environment Variables**.

## Build Validation

```bash
npm run typecheck   # TypeScript, zero errors
npm run lint         # ESLint, zero errors
npm run build         # Production build
```
