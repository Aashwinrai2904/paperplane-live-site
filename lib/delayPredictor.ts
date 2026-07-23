import { BUS_ROUTES } from "./metroVancouverData";
import {
  BottleneckSegment,
  CorridorSpeedReading,
  DelayPrediction,
  VehiclePosition,
} from "./types";

const ROUTE_TO_CORRIDOR: Record<string, string> = Object.fromEntries(
  BUS_ROUTES.map((r) => [r.routeId, r.corridorId])
);

const DEFAULT_HORIZON_MINUTES = 25;
const SEVERE_BOTTLENECK_RATIO = 0.3; // speeds < 30% free-flow
const MODERATE_BOTTLENECK_RATIO = 0.55;
const CASCADE_DELAY_TRIGGER_RATIO = 0.6; // speed drop worth forecasting a delay for

/**
 * Predictive Cascading Delay Engine.
 *
 * Cross-references RTDS corridor speed drops against live GTFS-RT vehicle
 * positions to forecast arrival delays 15-30 minutes ahead of official
 * TransLink GTFS-RT trip-update delay fields, which typically only reflect
 * delay *after* it has already accumulated. A sustained corridor speed drop
 * is treated as a leading indicator: the longer/deeper the drop, the more
 * the predicted delay compounds toward the forecast horizon (cascading
 * bunching), rather than assuming the vehicle recovers instantly.
 */
export function predictDelays(
  vehicles: VehiclePosition[],
  corridors: CorridorSpeedReading[],
  horizonMinutes: number = DEFAULT_HORIZON_MINUTES
): DelayPrediction[] {
  const corridorById = new Map(corridors.map((c) => [c.corridorId, c]));

  return vehicles.map((vehicle) => {
    const corridorId = ROUTE_TO_CORRIDOR[vehicle.routeId];
    const corridor = corridorId ? corridorById.get(corridorId) : undefined;
    return predictDelayForVehicle(vehicle, corridor, horizonMinutes);
  });
}

function predictDelayForVehicle(
  vehicle: VehiclePosition,
  corridor: CorridorSpeedReading | undefined,
  horizonMinutes: number
): DelayPrediction {
  const currentDelayMinutes = Math.max(0, vehicle.scheduledArrivalOffsetSec) / 60;

  if (!corridor) {
    // No road corridor mapping (SkyTrain / SeaBus run on dedicated
    // guideway/water routes) — extrapolate lightly from current offset only.
    return {
      vehicleId: vehicle.id,
      routeId: vehicle.routeId,
      routeName: vehicle.routeName,
      predictedDelayMinutes: Math.round(currentDelayMinutes * 10) / 10,
      confidence: 0.5,
      horizonMinutes,
      affectedCorridorIds: [],
      generatedAt: Date.now(),
    };
  }

  const speedRatio = corridor.congestionRatio; // current / free-flow
  const speedDrop = Math.max(0, 1 - speedRatio);

  let cascadeMinutes = 0;
  let confidence = 0.35;

  if (speedRatio < CASCADE_DELAY_TRIGGER_RATIO) {
    // Deeper, more sustained speed drops cascade super-linearly: a stalled
    // corridor doesn't just delay the current vehicle, it causes following
    // vehicles to bunch, amplifying the forecast delay toward the horizon.
    const severity = Math.pow(speedDrop, 1.3);
    cascadeMinutes = severity * horizonMinutes * 0.9;
    confidence = clamp01(0.45 + speedDrop * 0.55);
  } else {
    cascadeMinutes = speedDrop * horizonMinutes * 0.25;
    confidence = clamp01(0.3 + speedDrop * 0.3);
  }

  const predictedDelayMinutes = clamp(
    currentDelayMinutes + cascadeMinutes,
    0,
    horizonMinutes * 1.5
  );

  return {
    vehicleId: vehicle.id,
    routeId: vehicle.routeId,
    routeName: vehicle.routeName,
    predictedDelayMinutes: Math.round(predictedDelayMinutes * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    horizonMinutes,
    affectedCorridorIds: [corridor.corridorId],
    generatedAt: Date.now(),
  };
}

/**
 * Corridor Bottleneck Diagnostics — flags corridors where current speed has
 * dropped below 30% of free-flow (severe) or 55% (moderate).
 */
export function detectBottlenecks(
  corridors: CorridorSpeedReading[]
): BottleneckSegment[] {
  return corridors
    .filter((c) => c.congestionRatio < MODERATE_BOTTLENECK_RATIO)
    .map((c) => ({
      ...c,
      severity: (c.congestionRatio < SEVERE_BOTTLENECK_RATIO
        ? "severe"
        : "moderate") as BottleneckSegment["severity"],
    }))
    .sort((a, b) => a.congestionRatio - b.congestionRatio);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
