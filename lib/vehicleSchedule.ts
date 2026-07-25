import { SKYTRAIN_LINES, BUS_ROUTES, SEABUS_ROUTE } from "./metroVancouverData";
import { STATION_NAMES } from "./gisData";
import { VehiclePosition } from "./types";

export interface ScheduleStop {
  name: string;
  etaMinutes: number;
  status: "passed" | "next" | "upcoming";
}

// Approximate one-way route traversal time, matching the loop periods used
// by the mock vehicle animator in lib/translink.ts, so ETAs stay consistent
// with how fast vehicles actually appear to move on the map.
const ROUTE_TRAVERSAL_MINUTES: Record<VehiclePosition["mode"], number> = {
  skytrain: 22,
  seabus: 12,
  bus: 18,
};

function getStopSequence(routeId: string, mode: VehiclePosition["mode"]): { name: string; progress: number }[] {
  if (mode === "skytrain") {
    const line = SKYTRAIN_LINES.find((l) => l.routeId === routeId);
    const names = STATION_NAMES[routeId];
    if (!line || !names) return [];
    return line.path.map((_, i) => ({
      name: names[i] ?? `Stop ${i + 1}`,
      progress: i / (line.path.length - 1),
    }));
  }
  if (mode === "seabus") {
    return [
      { name: "Waterfront", progress: 0 },
      { name: "Lonsdale Quay", progress: 1 },
    ];
  }
  const route = BUS_ROUTES.find((r) => r.routeId === routeId);
  if (!route) return [];
  return route.path.map((_, i) => ({
    name: `Stop ${i + 1} (${route.routeShortName})`,
    progress: i / (route.path.length - 1),
  }));
}

/**
 * Builds a Mini Tokyo 3D-style stop schedule (previous/next/upcoming stops
 * with estimated times) for a tracked vehicle, derived from its normalized
 * position along the route path. ETAs are estimates based on the same
 * traversal-time assumptions used to animate the mock vehicle in the first
 * place — not a real GTFS schedule.
 */
export function buildVehicleSchedule(vehicle: VehiclePosition): ScheduleStop[] {
  const sequence = getStopSequence(vehicle.routeId, vehicle.mode);
  if (sequence.length === 0) return [];

  const progress = vehicle.pathProgress ?? 0;
  const direction = vehicle.pathDirection ?? 1;
  const traversalMinutes = ROUTE_TRAVERSAL_MINUTES[vehicle.mode];

  const withDistance = sequence.map((s) => ({
    ...s,
    aheadFrac: (s.progress - progress) * direction,
  }));
  withDistance.sort((a, b) => a.aheadFrac - b.aheadFrac);

  let assignedNext = false;
  return withDistance.map((s) => {
    let status: ScheduleStop["status"];
    if (s.aheadFrac < -0.01) {
      status = "passed";
    } else if (!assignedNext) {
      status = "next";
      assignedNext = true;
    } else {
      status = "upcoming";
    }
    return {
      name: s.name,
      etaMinutes: Math.round(Math.max(0, s.aheadFrac) * traversalMinutes * 10) / 10,
      status,
    };
  });
}
