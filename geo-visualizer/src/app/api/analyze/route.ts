import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { embedTexts } from "@/lib/embeddings";
import { reduceTo3D } from "@/lib/reduce";
import { detectContentGaps } from "@/lib/gapDetection";
import { getSupabaseServerClient } from "@/lib/supabase";
import type {
  AnalyzeResponseBody,
  SemanticPoint,
  SourceDocument,
} from "@/types/geo";

const requestSchema = z.object({
  pages: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        text: z.string().min(1).max(20000),
        url: z.string().url().optional(),
      }),
    )
    .max(200),
  queries: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        text: z.string().min(1).max(2000),
      }),
    )
    .max(200),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { pages, queries } = parsed.data;
  if (pages.length + queries.length < 2) {
    return NextResponse.json(
      { error: "Provide at least 2 total pages/queries to map a semantic space." },
      { status: 400 },
    );
  }

  const sources: SourceDocument[] = [
    ...pages.map((p, i) => ({
      id: `page-${i}`,
      label: p.label,
      kind: "page" as const,
      text: p.text,
      url: p.url,
    })),
    ...queries.map((q, i) => ({
      id: `query-${i}`,
      label: q.label,
      kind: "query" as const,
      text: q.text,
    })),
  ];

  const { vectors, mock, model } = await embedTexts(
    sources.map((s) => s.text),
  );
  const coords = reduceTo3D(vectors);

  const points: SemanticPoint[] = sources.map((s, i) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    url: s.url,
    x: coords[i][0],
    y: coords[i][1],
    z: coords[i][2],
  }));

  const gaps = detectContentGaps(points, sources);

  const body: AnalyzeResponseBody = {
    points,
    gaps,
    meta: {
      mockEmbeddings: mock,
      model,
      pageCount: pages.length,
      queryCount: queries.length,
    },
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("geo_runs").insert({
      page_count: pages.length,
      query_count: queries.length,
      mock_embeddings: mock,
      model,
      pages,
      queries,
      points,
      gaps,
    });
    if (error) {
      console.error("Failed to persist GEO run to Supabase:", error.message);
    }
  }

  return NextResponse.json(body);
}
