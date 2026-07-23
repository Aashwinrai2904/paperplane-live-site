"use client";

import { useEffect, useRef, useState } from "react";
import { VehiclePosition } from "@/lib/types";

interface SmoothedState {
  from: VehiclePosition;
  to: VehiclePosition;
  startTime: number;
}

/**
 * Smoothly interpolates vehicle positions at animation-frame rate between
 * discrete GTFS-RT polling snapshots (typically every ~10s), so markers glide
 * across the map instead of jumping on each fetch.
 */
export function useSmoothedVehicles(
  vehicles: VehiclePosition[],
  pollIntervalMs = 10000
): VehiclePosition[] {
  const stateRef = useRef<Map<string, SmoothedState>>(new Map());
  const [, forceRender] = useState(0);

  useEffect(() => {
    const now = performance.now();
    const prevMap = stateRef.current;
    const nextMap = new Map<string, SmoothedState>();
    for (const v of vehicles) {
      const prev = prevMap.get(v.id);
      const fromVehicle = prev ? interpolatedSnapshot(prev, now, pollIntervalMs) : v;
      nextMap.set(v.id, { from: fromVehicle, to: v, startTime: now });
    }
    stateRef.current = nextMap;
  }, [vehicles, pollIntervalMs]);

  useEffect(() => {
    let mounted = true;
    let raf = 0;
    const loop = () => {
      if (!mounted) return;
      forceRender((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const now = performance.now();
  return Array.from(stateRef.current.values()).map((s) =>
    interpolatedSnapshot(s, now, pollIntervalMs)
  );
}

function interpolatedSnapshot(
  s: SmoothedState,
  now: number,
  pollIntervalMs: number
): VehiclePosition {
  const t = Math.min(1, (now - s.startTime) / pollIntervalMs);
  return {
    ...s.to,
    lat: s.from.lat + (s.to.lat - s.from.lat) * t,
    lon: s.from.lon + (s.to.lon - s.from.lon) * t,
    bearing: shortestAngleLerp(s.from.bearing, s.to.bearing, t),
  };
}

function shortestAngleLerp(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}
