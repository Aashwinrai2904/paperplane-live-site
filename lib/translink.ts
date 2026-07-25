import {
  BUS_ROUTES,
  CORRIDORS,
  SEABUS_ROUTE,
  SKYTRAIN_LINES,
  TRANSIT_HUBS,
} from "./metroVancouverData";
import { interpolateAlongPath, seededRandom } from "./geoUtils";
import {
  CorridorSpeedReading,
  CrowdLevel,
  ServiceAlert,
  SystemStats,
  TsprStopStat,
  VehiclePosition,
} from "./types";

const TRANSLINK_API_KEY = process.env.TRANSLINK_API_KEY;
const GTFS_RT_URL =
  process.env.TRANSLINK_GTFS_RT_URL ??
  "https://gtfsapi.translink.ca/v3/gtfsrealtime";
const RTDS_URL = process.env.TRANSLINK_RTDS_URL;
const TSPR_URL = process.env.TRANSLINK_TSPR_URL;

const hasLiveKey = Boolean(TRANSLINK_API_KEY);

// ---------------------------------------------------------------------------
// GTFS-Realtime (live vehicle positions + service alerts)
// ---------------------------------------------------------------------------

export async function getVehiclePositions(): Promise<VehiclePosition[]> {
  if (hasLiveKey) {
    try {
      return await fetchLiveVehiclePositions();
    } catch (err) {
      console.error("[translink] live GTFS-RT fetch failed, using mock data:", err);
    }
  }
  return generateMockVehiclePositions();
}

export async function getServiceAlerts(): Promise<ServiceAlert[]> {
  if (hasLiveKey) {
    try {
      return await fetchLiveServiceAlerts();
    } catch (err) {
      console.error("[translink] live alerts fetch failed, using mock data:", err);
    }
  }
  return generateMockAlerts();
}

async function fetchLiveVehiclePositions(): Promise<VehiclePosition[]> {
  const url = `${GTFS_RT_URL}/gtfsrealtime/v2/gtfs-realtime?feed=pb&apikey=${TRANSLINK_API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 10 } });
  if (!res.ok) throw new Error(`GTFS-RT request failed: ${res.status}`);
  const buffer = new Uint8Array(await res.arrayBuffer());

  const gtfsRealtimeBindings = await import("gtfs-realtime-bindings");
  const feed = gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

  const vehicles: VehiclePosition[] = [];
  for (const entity of feed.entity) {
    if (!entity.vehicle?.position) continue;
    const v = entity.vehicle;
    const pos = v.position!;
    const routeId = v.trip?.routeId ?? "unknown";
    vehicles.push({
      id: entity.id,
      tripId: v.trip?.tripId ?? entity.id,
      routeId,
      routeName: routeId,
      mode: inferModeFromRouteId(routeId),
      lat: pos.latitude,
      lon: pos.longitude,
      bearing: pos.bearing ?? 0,
      speedKmh: (pos.speed ?? 0) * 3.6,
      timestamp: Number(v.timestamp ?? Date.now() / 1000) * 1000,
      occupancyRatio: occupancyStatusToRatio(v.occupancyStatus),
      crowdLevel: ratioToCrowdLevel(occupancyStatusToRatio(v.occupancyStatus)),
      scheduledArrivalOffsetSec: 0,
    });
  }
  return vehicles;
}

async function fetchLiveServiceAlerts(): Promise<ServiceAlert[]> {
  const url = `${GTFS_RT_URL}/gtfsrealtime/v2/gtfs-realtime?feed=alerts&apikey=${TRANSLINK_API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`GTFS-RT alerts request failed: ${res.status}`);
  const buffer = new Uint8Array(await res.arrayBuffer());

  const gtfsRealtimeBindings = await import("gtfs-realtime-bindings");
  const feed = gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

  const alerts: ServiceAlert[] = [];
  for (const entity of feed.entity) {
    if (!entity.alert) continue;
    const a = entity.alert;
    alerts.push({
      id: entity.id,
      routeIds: (a.informedEntity ?? [])
        .map((e) => e.routeId)
        .filter((r): r is string => Boolean(r)),
      header: a.headerText?.translation?.[0]?.text ?? "Service Alert",
      rawDescription: a.descriptionText?.translation?.[0]?.text ?? "",
      severity: mapAlertSeverity(a.severityLevel),
      effect: String(a.effect ?? "UNKNOWN_EFFECT"),
      createdAt: Date.now(),
    });
  }
  return alerts;
}

function inferModeFromRouteId(routeId: string): VehiclePosition["mode"] {
  if (["EXPO", "MILLENNIUM", "CANADA"].includes(routeId)) return "skytrain";
  if (routeId === "SEABUS") return "seabus";
  return "bus";
}

function occupancyStatusToRatio(status: number | null | undefined): number {
  // GTFS-RT OccupancyStatus enum: 0=EMPTY .. 6=FULL
  if (status == null) return 0.35;
  return Math.min(1, status / 5);
}

function ratioToCrowdLevel(ratio: number): CrowdLevel {
  if (ratio < 0.4) return "low";
  if (ratio < 0.75) return "moderate";
  return "high";
}

function mapAlertSeverity(level: unknown): ServiceAlert["severity"] {
  const s = String(level ?? "").toUpperCase();
  if (s.includes("SEVERE")) return "severe";
  if (s.includes("WARNING")) return "warning";
  return "info";
}

// ---------------------------------------------------------------------------
// RTDS — corridor speed / travel-time
// ---------------------------------------------------------------------------

export async function getCorridorSpeeds(): Promise<CorridorSpeedReading[]> {
  if (RTDS_URL && TRANSLINK_API_KEY) {
    try {
      const res = await fetch(`${RTDS_URL}?apikey=${TRANSLINK_API_KEY}`, {
        next: { revalidate: 30 },
      });
      if (!res.ok) throw new Error(`RTDS request failed: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as CorridorSpeedReading[];
      }
    } catch (err) {
      console.error("[translink] live RTDS fetch failed, using mock data:", err);
    }
  }
  return generateMockCorridorSpeeds();
}

// ---------------------------------------------------------------------------
// TSPR — historical boarding / ridership baselines
// ---------------------------------------------------------------------------

export async function getTsprStats(): Promise<TsprStopStat[]> {
  if (TSPR_URL && TRANSLINK_API_KEY) {
    try {
      const res = await fetch(`${TSPR_URL}?apikey=${TRANSLINK_API_KEY}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) throw new Error(`TSPR request failed: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as TsprStopStat[];
      }
    } catch (err) {
      console.error("[translink] live TSPR fetch failed, using mock data:", err);
    }
  }
  return generateMockTsprStats();
}

// ---------------------------------------------------------------------------
// Mock data generators — deterministic-but-animated fallbacks used whenever
// TRANSLINK_API_KEY / dataset URLs are absent, so the app runs fully featured
// in local dev and preview deployments with zero configuration.
// ---------------------------------------------------------------------------

const SKYTRAIN_TRAINS_PER_LINE = 5;
const SEABUS_VESSELS = 2;
const BUSES_PER_ROUTE = 4;
const SKYTRAIN_LOOP_MS = 22 * 60 * 1000;
const SEABUS_LOOP_MS = 12 * 60 * 1000;
const BUS_LOOP_MS = 18 * 60 * 1000;

function timeOfDayLoadFactor(now: number): number {
  const hour = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  const amPeak = Math.exp(-((hour - 8.25) ** 2) / (2 * 1.1 ** 2));
  const pmPeak = Math.exp(-((hour - 17.25) ** 2) / (2 * 1.3 ** 2));
  return Math.min(1, 0.18 + 0.82 * Math.max(amPeak, pmPeak));
}

export function generateMockVehiclePositions(now = Date.now()): VehiclePosition[] {
  const vehicles: VehiclePosition[] = [];
  const baseLoad = timeOfDayLoadFactor(now);

  for (const line of SKYTRAIN_LINES) {
    for (let i = 0; i < SKYTRAIN_TRAINS_PER_LINE; i++) {
      const id = `${line.routeId}-T${i}`;
      const rand = seededRandom(id);
      const phase = i / SKYTRAIN_TRAINS_PER_LINE + rand() * 0.03;
      const direction = i % 2 === 0 ? 1 : -1;
      const t = phase + (direction * now) / SKYTRAIN_LOOP_MS;
      const { position, bearing } = interpolateAlongPath(line.path, t);
      const occupancy = clamp01(baseLoad * (0.6 + rand() * 0.6));
      vehicles.push({
        id,
        tripId: id,
        routeId: line.routeId,
        routeName: line.name,
        mode: "skytrain",
        lat: position[1],
        lon: position[0],
        bearing: direction > 0 ? bearing : (bearing + 180) % 360,
        speedKmh: 55 + rand() * 20,
        timestamp: now,
        occupancyRatio: occupancy,
        crowdLevel: ratioToCrowdLevel(occupancy),
        scheduledArrivalOffsetSec: Math.round((rand() - 0.5) * 90),
        pathProgress: loopedFraction(t),
        pathDirection: direction as 1 | -1,
      });
    }
  }

  {
    for (let i = 0; i < SEABUS_VESSELS; i++) {
      const id = `SEABUS-V${i}`;
      const rand = seededRandom(id);
      const phase = i / SEABUS_VESSELS;
      const direction = i % 2 === 0 ? 1 : -1;
      const t = phase + (direction * now) / SEABUS_LOOP_MS;
      const { position, bearing } = interpolateAlongPath(SEABUS_ROUTE, t);
      const occupancy = clamp01(baseLoad * (0.5 + rand() * 0.5));
      vehicles.push({
        id,
        tripId: id,
        routeId: "SEABUS",
        routeName: "SeaBus",
        mode: "seabus",
        lat: position[1],
        lon: position[0],
        bearing: direction > 0 ? bearing : (bearing + 180) % 360,
        speedKmh: 22 + rand() * 6,
        timestamp: now,
        occupancyRatio: occupancy,
        crowdLevel: ratioToCrowdLevel(occupancy),
        scheduledArrivalOffsetSec: Math.round((rand() - 0.5) * 60),
        pathProgress: loopedFraction(t),
        pathDirection: direction as 1 | -1,
      });
    }
  }

  const corridorSpeeds = generateMockCorridorSpeeds(now);
  const corridorById = new Map(corridorSpeeds.map((c) => [c.corridorId, c]));

  for (const route of BUS_ROUTES) {
    const corridor = corridorById.get(route.corridorId);
    const congestion = corridor ? corridor.congestionRatio : 1;
    for (let i = 0; i < BUSES_PER_ROUTE; i++) {
      const id = `${route.routeId}-B${i}`;
      const rand = seededRandom(id);
      const phase = i / BUSES_PER_ROUTE + rand() * 0.05;
      const direction = i % 2 === 0 ? 1 : -1;
      // Congested corridors slow the loop, i.e. buses bunch/lag realistically.
      const effectiveLoopMs = BUS_LOOP_MS / Math.max(0.35, congestion);
      const t = phase + (direction * now) / effectiveLoopMs;
      const { position, bearing } = interpolateAlongPath(route.path, t);
      const occupancy = clamp01(baseLoad * (0.7 + rand() * 0.5) + (1 - congestion) * 0.15);
      const delaySec = Math.round((1 - congestion) * 420 * (0.6 + rand() * 0.8));
      vehicles.push({
        id,
        tripId: id,
        routeId: route.routeId,
        routeName: route.routeLongName,
        mode: "bus",
        lat: position[1],
        lon: position[0],
        bearing: direction > 0 ? bearing : (bearing + 180) % 360,
        speedKmh: Math.max(5, (corridor?.currentSpeedKmh ?? 35) * (0.85 + rand() * 0.3)),
        timestamp: now,
        nextStopId: route.corridorId,
        occupancyRatio: occupancy,
        crowdLevel: ratioToCrowdLevel(occupancy),
        scheduledArrivalOffsetSec: delaySec,
        pathProgress: loopedFraction(t),
        pathDirection: direction as 1 | -1,
      });
    }
  }

  return vehicles;
}

export function generateMockCorridorSpeeds(now = Date.now()): CorridorSpeedReading[] {
  const baseLoad = timeOfDayLoadFactor(now);
  return CORRIDORS.map((corridor) => {
    const rand = seededRandom(corridor.corridorId + Math.floor(now / 60000));
    // Congestion ratio dips during peaks; highway drops harder than local streets.
    const highwayFactor = corridor.corridorId === "highway-1" ? 1.3 : 1;
    const dip = baseLoad * highwayFactor * (0.35 + rand() * 0.35);
    const congestionRatio = clamp01(1 - dip);
    return {
      ...corridor,
      currentSpeedKmh: Math.round(corridor.freeFlowSpeedKmh * congestionRatio * 10) / 10,
      congestionRatio: Math.round(congestionRatio * 1000) / 1000,
      timestamp: now,
    };
  });
}

export function generateMockTsprStats(): TsprStopStat[] {
  return TRANSIT_HUBS.map((hub) => {
    const rand = seededRandom(hub.id);
    const avgBoardings = Math.round(400 + rand() * 3200);
    return {
      stopId: hub.id,
      stopName: hub.name,
      lat: hub.lat,
      lon: hub.lon,
      routeId: hub.modes.includes("skytrain") ? "EXPO" : "SEABUS",
      avgBoardings,
      avgAlightings: Math.round(avgBoardings * (0.85 + rand() * 0.3)),
      peakLoadFactor: Math.round((0.4 + rand() * 0.9) * 100) / 100,
    };
  });
}

const MOCK_ALERT_TEMPLATES: {
  effect: string;
  header: string;
  body: string;
  severity: ServiceAlert["severity"];
  lat: number;
  lon: number;
}[] = [
  {
    effect: "DETOUR",
    header: "Route 099 detour via Broadway",
    body:
      "Due to a collision investigation at Broadway & Commercial, buses on the 099 are detoured via 12th Ave between Commercial and Kingsway until further notice. Expect delays of 10-15 minutes.",
    severity: "warning",
    lat: 49.2707,
    lon: -123.0754,
  },
  {
    effect: "SIGNIFICANT_DELAYS",
    header: "Expo Line residual delays",
    body:
      "Expo Line is experiencing residual delays of up to 8 minutes eastbound between Waterfront and Metrotown due to an earlier mechanical issue at Main St-Science World.",
    severity: "warning",
    lat: 49.2721,
    lon: -123.0844,
  },
  {
    effect: "REDUCED_SERVICE",
    header: "SeaBus reduced frequency",
    body:
      "One vessel is out of service for scheduled maintenance. SeaBus is running on a reduced 30-minute frequency between Waterfront and Lonsdale Quay.",
    severity: "info",
    lat: 49.2856,
    lon: -123.1113,
  },
  {
    effect: "STOP_MOVED",
    header: "Temporary stop relocation on Hastings",
    body:
      "The eastbound stop at Hastings & Nanaimo is temporarily relocated one block east due to construction. Route 095 impacted.",
    severity: "info",
    lat: 49.2812,
    lon: -123.0389,
  },
];

export function generateMockAlerts(now = Date.now()): ServiceAlert[] {
  return MOCK_ALERT_TEMPLATES.map((tpl, i) => ({
    id: `mock-alert-${i}`,
    routeIds: [],
    header: tpl.header,
    rawDescription: tpl.body,
    severity: tpl.severity,
    effect: tpl.effect,
    createdAt: now - i * 6 * 60 * 1000,
    lat: tpl.lat,
    lon: tpl.lon,
  }));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function loopedFraction(t: number): number {
  return ((t % 1) + 1) % 1;
}

// ---------------------------------------------------------------------------
// Aggregate system stats — pure function so both server routes and the
// client dashboard can derive stats from data they already fetched, without
// triggering redundant network/mock calls.
// ---------------------------------------------------------------------------

export function computeSystemStats(
  vehicles: VehiclePosition[],
  corridors: CorridorSpeedReading[],
  alerts: ServiceAlert[]
): SystemStats {
  const activeBuses = vehicles.filter((v) => v.mode === "bus").length;
  const activeSkyTrains = vehicles.filter((v) => v.mode === "skytrain").length;
  const activeSeaBuses = vehicles.filter((v) => v.mode === "seabus").length;

  const avgCongestion =
    corridors.reduce((sum, c) => sum + c.congestionRatio, 0) / (corridors.length || 1);
  const avgDelayMinutes =
    vehicles.reduce((sum, v) => sum + Math.max(0, v.scheduledArrivalOffsetSec), 0) /
    (vehicles.length || 1) /
    60;

  const systemEfficiency = Math.round(
    clamp01(avgCongestion * 0.7 + (1 - Math.min(1, avgDelayMinutes / 10)) * 0.3) * 100
  );

  return {
    activeBuses,
    activeSkyTrains,
    activeSeaBuses,
    totalVehicles: vehicles.length,
    systemEfficiency,
    avgDelayMinutes: Math.round(avgDelayMinutes * 10) / 10,
    alertCount: alerts.length,
    generatedAt: Date.now(),
  };
}

export const isLiveDataConfigured = hasLiveKey;
