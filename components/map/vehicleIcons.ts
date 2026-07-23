"use client";

export interface IconAtlas {
  atlas: string;
  mapping: Record<
    string,
    { x: number; y: number; width: number; height: number; mask: boolean }
  >;
}

const ICON_SIZE = 64;
const ICONS = ["bus", "skytrain", "seabus", "hub"] as const;

/**
 * Builds a single white-silhouette icon atlas (data URL) on an offscreen
 * canvas for deck.gl's IconLayer. Icons are drawn as alpha-masked shapes so
 * IconLayer's getColor can tint each glyph per-vehicle at render time.
 */
export function createVehicleIconAtlas(): IconAtlas {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE * ICONS.length;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";

  ICONS.forEach((name, i) => {
    const cx = i * ICON_SIZE + ICON_SIZE / 2;
    const cy = ICON_SIZE / 2;
    ctx.save();
    ctx.translate(cx, cy);
    drawIcon(ctx, name);
    ctx.restore();
  });

  const mapping: IconAtlas["mapping"] = {};
  ICONS.forEach((name, i) => {
    mapping[name] = { x: i * ICON_SIZE, y: 0, width: ICON_SIZE, height: ICON_SIZE, mask: true };
  });

  return { atlas: canvas.toDataURL(), mapping };
}

function drawIcon(ctx: CanvasRenderingContext2D, name: (typeof ICONS)[number]) {
  const r = 18;
  ctx.beginPath();
  switch (name) {
    case "bus":
      // Forward-pointing rounded arrow (vehicle heading indicator).
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.85, r * 0.75);
      ctx.quadraticCurveTo(0, r * 0.35, -r * 0.85, r * 0.75);
      ctx.closePath();
      ctx.fill();
      break;
    case "skytrain":
      // Sharper chevron for rail vehicles.
      ctx.moveTo(0, -r * 1.1);
      ctx.lineTo(r * 0.7, r * 0.9);
      ctx.lineTo(0, r * 0.5);
      ctx.lineTo(-r * 0.7, r * 0.9);
      ctx.closePath();
      ctx.fill();
      break;
    case "seabus":
      // Hull/boat silhouette.
      ctx.ellipse(0, 0, r * 0.95, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "hub":
      // Diamond marker for transit hubs.
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      break;
  }
}
