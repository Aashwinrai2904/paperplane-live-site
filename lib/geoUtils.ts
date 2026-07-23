export type LonLat = [number, number];

function haversineMeters(a: LonLat, b: LonLat): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function pathLengthMeters(path: LonLat[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineMeters(path[i - 1], path[i]);
  }
  return total;
}

export function bearingBetween(a: LonLat, b: LonLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLon = toRad(b[0] - a[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Returns a point + bearing at fraction `t` (0-1, looping) along a polyline,
 * used to animate mock vehicles smoothly along real corridor/track shapes.
 */
export function interpolateAlongPath(
  path: LonLat[],
  t: number
): { position: LonLat; bearing: number } {
  if (path.length < 2) {
    return { position: path[0] ?? [0, 0], bearing: 0 };
  }
  const looped = ((t % 1) + 1) % 1;
  const segLengths: number[] = [];
  for (let i = 1; i < path.length; i++) {
    segLengths.push(haversineMeters(path[i - 1], path[i]));
  }
  const total = segLengths.reduce((a, b) => a + b, 0);
  const targetDist = looped * total;

  let cumulative = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (cumulative + segLen >= targetDist || i === segLengths.length - 1) {
      const segT = segLen === 0 ? 0 : (targetDist - cumulative) / segLen;
      const a = path[i];
      const b = path[i + 1];
      const position: LonLat = [
        a[0] + (b[0] - a[0]) * segT,
        a[1] + (b[1] - a[1]) * segT,
      ];
      return { position, bearing: bearingBetween(a, b) };
    }
    cumulative += segLen;
  }
  return { position: path[path.length - 1], bearing: 0 };
}

/** Simple deterministic pseudo-random generator seeded by a string. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
