import type { ContentGapBlueprint, SemanticPoint, SourceDocument } from "@/types/geo";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "is", "are",
  "what", "how", "why", "with", "your", "you", "best", "vs", "that", "this",
  "it", "be", "by", "at", "as", "can", "do", "does", "will", "should", "i",
]);

function distance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  );
}

function extractKeywords(texts: string[], limit = 6): string[] {
  const freq = new Map<string, number>();
  for (const text of texts) {
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t));
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

export function detectContentGaps(
  points: SemanticPoint[],
  sources: SourceDocument[],
): ContentGapBlueprint[] {
  const pagePoints = points.filter((p) => p.kind === "page");
  const queryPoints = points.filter((p) => p.kind === "query");
  if (queryPoints.length === 0) return [];

  const textById = new Map(sources.map((s) => [s.id, s.text]));

  const coverageRadius = computeCoverageRadius(pagePoints, points);

  const flagged = queryPoints
    .map((q) => {
      const nearestPageDist = pagePoints.length
        ? Math.min(
            ...pagePoints.map((p) =>
              distance([q.x, q.y, q.z], [p.x, p.y, p.z]),
            ),
          )
        : Infinity;
      return { point: q, nearestPageDist };
    })
    .filter((entry) => entry.nearestPageDist > coverageRadius);

  const clusters = clusterByProximity(
    flagged.map((f) => f.point),
    coverageRadius * 0.9,
  );

  return clusters.map((cluster, index) => {
    const centroid: [number, number, number] = [
      average(cluster.map((c) => c.x)),
      average(cluster.map((c) => c.y)),
      average(cluster.map((c) => c.z)),
    ];

    const nearestPages = [...pagePoints]
      .sort(
        (a, b) =>
          distance(centroid, [a.x, a.y, a.z]) -
          distance(centroid, [b.x, b.y, b.z]),
      )
      .slice(0, 3)
      .map((p) => p.label);

    const clusterTexts = cluster.map((c) => textById.get(c.id) ?? c.label);
    const keywords = extractKeywords(clusterTexts);
    const strength = Math.min(1, cluster.length / Math.max(1, queryPoints.length) + 0.15);

    return {
      id: `gap-${index}`,
      center: centroid,
      strength,
      nearestQueries: cluster.map((c) => c.label),
      nearestPages,
      title: keywords.length
        ? `Content Gap: ${keywords.slice(0, 3).join(", ")}`
        : `Content Gap #${index + 1}`,
      recommendation: nearestPages.length
        ? `No existing page sits within semantic reach of these search intents. Create or expand content bridging from "${nearestPages[0]}" to directly target: ${keywords.join(", ") || "this topic cluster"}.`
        : `No content exists for this topic cluster yet. Create a dedicated page targeting: ${keywords.join(", ") || "this topic cluster"}.`,
      suggestedKeywords: keywords,
    };
  });
}

function computeCoverageRadius(
  pagePoints: SemanticPoint[],
  allPoints: SemanticPoint[],
): number {
  if (pagePoints.length >= 2) {
    const nearestDists = pagePoints.map((p) => {
      const others = pagePoints.filter((o) => o.id !== p.id);
      return Math.min(
        ...others.map((o) => distance([p.x, p.y, p.z], [o.x, o.y, o.z])),
      );
    });
    return median(nearestDists);
  }

  if (allPoints.length >= 2) {
    const dists: number[] = [];
    for (let i = 0; i < allPoints.length; i++) {
      for (let j = i + 1; j < allPoints.length; j++) {
        dists.push(
          distance(
            [allPoints[i].x, allPoints[i].y, allPoints[i].z],
            [allPoints[j].x, allPoints[j].y, allPoints[j].z],
          ),
        );
      }
    }
    return median(dists) * 0.5;
  }

  return 2;
}

function clusterByProximity(
  points: SemanticPoint[],
  radius: number,
): SemanticPoint[][] {
  const remaining = [...points];
  const clusters: SemanticPoint[][] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const cluster = [seed];
    for (let i = remaining.length - 1; i >= 0; i--) {
      const candidate = remaining[i];
      const withinRadius = cluster.some(
        (member) =>
          distance(
            [member.x, member.y, member.z],
            [candidate.x, candidate.y, candidate.z],
          ) <= radius,
      );
      if (withinRadius) {
        cluster.push(candidate);
        remaining.splice(i, 1);
      }
    }
    clusters.push(cluster);
  }

  return clusters;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
