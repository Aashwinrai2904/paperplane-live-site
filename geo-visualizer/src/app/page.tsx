"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import InputPanel, { type PageInput, type QueryInput } from "@/components/InputPanel";
import GapPanel from "@/components/GapPanel";
import type { AnalyzeResponseBody } from "@/types/geo";

const SemanticCanvas = dynamic(() => import("@/components/SemanticCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/10 bg-[#05070c] text-sm text-white/30">
      Loading 3D canvas…
    </div>
  ),
});

const SEED_PAGES: PageInput[] = [
  {
    label: "/blog/what-is-geo",
    url: "",
    text: "Generative Engine Optimization (GEO) is the practice of optimizing content so AI answer engines like ChatGPT, Perplexity, and Gemini cite and recommend your brand in generated answers.",
  },
  {
    label: "/blog/seo-vs-geo",
    url: "",
    text: "Traditional SEO ranks pages in a list of blue links using keywords and backlinks. GEO instead optimizes for being synthesized into a single generated answer, prioritizing clarity, citations, and semantic completeness.",
  },
];

const SEED_QUERIES: QueryInput[] = [
  { label: "what is GEO marketing", text: "what is GEO marketing" },
  { label: "how is GEO different from SEO", text: "how is GEO different from SEO" },
  { label: "how to optimize content for ChatGPT answers", text: "how to optimize content for ChatGPT answers" },
  { label: "best tools for generative engine optimization", text: "best tools for generative engine optimization" },
];

export default function Home() {
  const [pages, setPages] = useState<PageInput[]>(SEED_PAGES);
  const [queries, setQueries] = useState<QueryInput[]>(SEED_QUERIES);
  const [result, setResult] = useState<AnalyzeResponseBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: pages
            .filter((p) => p.label.trim() && p.text.trim())
            .map((p) => ({
              label: p.label.trim(),
              text: p.text.trim(),
              url: p.url.trim() || undefined,
            })),
          queries: queries
            .filter((q) => q.text.trim())
            .map((q) => ({
              label: (q.label || q.text).trim(),
              text: q.text.trim(),
            })),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${response.status})`);
      }

      const data = (await response.json()) as AnalyzeResponseBody;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#05070c] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            GEO Semantic Visualizer
          </h1>
          <p className="text-xs text-white/40">
            3D vector map of topical authority for generative search
          </p>
        </div>
        {result && (
          <div className="text-right text-xs text-white/40">
            <div>
              model:{" "}
              <span className="text-white/70">{result.meta.model}</span>
            </div>
            <div>
              {result.meta.pageCount} pages · {result.meta.queryCount} queries
              {result.meta.mockEmbeddings && (
                <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">
                  mock embeddings
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="grid flex-1 grid-cols-[360px_1fr_320px] overflow-hidden">
        <div className="border-r border-white/10">
          <InputPanel
            pages={pages}
            queries={queries}
            onPagesChange={setPages}
            onQueriesChange={setQueries}
            onSubmit={runAnalysis}
            loading={loading}
          />
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {result ? (
            <SemanticCanvas points={result.points} gaps={result.gaps} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/30">
              Run an analysis to render the semantic landscape
            </div>
          )}
        </div>

        <div className="border-l border-white/10">
          <GapPanel gaps={result?.gaps ?? []} />
        </div>
      </main>
    </div>
  );
}
