import { CrowdLevel, TransitMode } from "./types";

export function hexToRgb(hex: string, alpha = 255): [number, number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, alpha];
}

export const MODE_COLOR_HEX: Record<TransitMode, string> = {
  bus: "#4FC3F7",
  skytrain: "#FFC107",
  seabus: "#26C6DA",
};

export const CROWD_COLOR_HEX: Record<CrowdLevel, string> = {
  low: "#34D399",
  moderate: "#FBBF24",
  high: "#F87171",
};

export function modeColor(mode: TransitMode, alpha = 255): [number, number, number, number] {
  return hexToRgb(MODE_COLOR_HEX[mode], alpha);
}

export function crowdColor(level: CrowdLevel, alpha = 255): [number, number, number, number] {
  return hexToRgb(CROWD_COLOR_HEX[level], alpha);
}

/** Green -> yellow -> red ramp for corridor congestion ratio (1 = free-flow, 0 = gridlock). */
export function congestionColor(ratio: number, alpha = 255): [number, number, number, number] {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped > 0.55) return hexToRgb(CROWD_COLOR_HEX.low, alpha);
  if (clamped > 0.3) return hexToRgb(CROWD_COLOR_HEX.moderate, alpha);
  return hexToRgb(CROWD_COLOR_HEX.high, alpha);
}
