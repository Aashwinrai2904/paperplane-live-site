# GEO Semantic Visualizer

A 3D semantic vector visualizer for Generative Engine Optimization (GEO) and
SEO — maps site content and search-intent queries into an abstract 3D space
where distance represents conceptual similarity, then flags content gaps
(empty zones in the topic map) with keyword blueprints for ranking in AI
search engines (ChatGPT, Perplexity, Gemini).

This is the **Light Version**: manual text input, no crawler, no database
required. Everything runs end-to-end without any API keys.

## Pipeline

1. **Embeddings** (`src/lib/embeddings.ts`) — turns page/query text into
   vectors using Nomic's `nomic-embed-text-v1.5` via Fireworks AI. Falls back
   to a deterministic mock embedding (same text -> same vector) when
   `FIREWORKS_API_KEY` isn't set, so the whole app is testable for free.
2. **Dimensionality reduction** (`src/lib/reduce.ts`) — UMAP (`umap-js`)
   compresses embeddings to 3D coordinates.
3. **3D canvas** (`src/components/SemanticCanvas.tsx`) — React Three Fiber
   scene rendering pages/queries as glowing nodes with bloom postprocessing.
4. **Content gap engine** (`src/lib/gapDetection.ts`) — finds query points far
   from any page point, clusters them, and generates a keyword/optimization
   blueprint per gap.

All four stages are orchestrated by `POST /api/analyze`.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000, edit the seeded pages/queries (or add your own),
and click **Run GEO Analysis**.

## Configuration (all optional)

Copy `.env.example` to `.env.local`:

- `FIREWORKS_API_KEY` — enables real embeddings instead of the mock.
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — persists every
  run to Supabase (`supabase/migrations/0001_init.sql`). Without these, runs
  are in-memory only.

## Deploying

This is a standard Next.js app — deploy with `vercel deploy` or connect the
repo in the Vercel dashboard. Set the env vars above as Vercel project
environment variables if you want live embeddings/persistence.
