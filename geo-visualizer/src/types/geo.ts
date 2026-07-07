export type SourceKind = "page" | "query";

export interface SourceDocument {
  id: string;
  label: string;
  kind: SourceKind;
  text: string;
  url?: string;
}

export interface AnalyzeRequestBody {
  pages: { label: string; text: string; url?: string }[];
  queries: { label: string; text: string }[];
}

export interface SemanticPoint {
  id: string;
  label: string;
  kind: SourceKind;
  url?: string;
  x: number;
  y: number;
  z: number;
}

export interface ContentGapBlueprint {
  id: string;
  center: [number, number, number];
  strength: number;
  nearestQueries: string[];
  nearestPages: string[];
  title: string;
  recommendation: string;
  suggestedKeywords: string[];
}

export interface AnalyzeResponseBody {
  points: SemanticPoint[];
  gaps: ContentGapBlueprint[];
  meta: {
    mockEmbeddings: boolean;
    model: string;
    pageCount: number;
    queryCount: number;
  };
}
