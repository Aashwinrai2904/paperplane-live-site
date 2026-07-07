import { UMAP } from "umap-js";

const TARGET_SCALE = 12;

/**
 * Reduces high-dimensional embeddings to 3D semantic coordinates.
 * nNeighbors is clamped to the dataset size since UMAP requires
 * nNeighbors < number of samples, which small "Light Version" inputs
 * (a handful of pages/queries) would otherwise violate.
 */
export function reduceTo3D(vectors: number[][]): [number, number, number][] {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [[0, 0, 0]];

  if (n === 2) {
    return [
      [-TARGET_SCALE / 2, 0, 0],
      [TARGET_SCALE / 2, 0, 0],
    ];
  }

  const nNeighbors = Math.max(2, Math.min(15, n - 1));
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors,
    minDist: 0.25,
    spread: 1.5,
  });

  const raw = umap.fit(vectors);
  return normalize(raw);
}

function normalize(points: number[][]): [number, number, number][] {
  const dims = 3;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const p of points) {
    for (let d = 0; d < dims; d++) {
      min[d] = Math.min(min[d], p[d]);
      max[d] = Math.max(max[d], p[d]);
    }
  }

  return points.map((p) => {
    const out: [number, number, number] = [0, 0, 0];
    for (let d = 0; d < dims; d++) {
      const range = max[d] - min[d] || 1;
      const centered = (p[d] - min[d]) / range - 0.5;
      out[d] = centered * TARGET_SCALE;
    }
    return out;
  });
}
