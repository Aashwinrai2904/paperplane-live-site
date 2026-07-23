export type TransitMode = "bus" | "skytrain" | "seabus";

export type CrowdLevel = "low" | "moderate" | "high";

export interface VehiclePosition {
  id: string;
  tripId: string;
  routeId: string;
  routeName: string;
  mode: TransitMode;
  lat: number;
  lon: number;
  bearing: number;
  speedKmh: number;
  timestamp: number;
  nextStopId?: string;
  nextStopName?: string;
  occupancyRatio: number; // 0-1, derived crowd estimate
  crowdLevel: CrowdLevel;
  scheduledArrivalOffsetSec: number; // seconds ahead(-)/behind(+) schedule at last GTFS-RT ping
}

export type AlertSeverity = "info" | "warning" | "severe";

export interface ServiceAlert {
  id: string;
  routeIds: string[];
  header: string;
  rawDescription: string;
  severity: AlertSeverity;
  effect: string;
  createdAt: number;
  aiSummary?: string;
  aiDetourAdvice?: string;
}

export interface CorridorSpeedReading {
  corridorId: string;
  name: string;
  path: [number, number][];
  currentSpeedKmh: number;
  freeFlowSpeedKmh: number;
  congestionRatio: number; // current / freeFlow
  timestamp: number;
}

export interface BottleneckSegment extends CorridorSpeedReading {
  severity: "moderate" | "severe";
}

export interface TsprStopStat {
  stopId: string;
  stopName: string;
  lat: number;
  lon: number;
  routeId: string;
  avgBoardings: number;
  avgAlightings: number;
  peakLoadFactor: number; // 0-1+
}

export interface DelayPrediction {
  vehicleId: string;
  routeId: string;
  routeName: string;
  predictedDelayMinutes: number;
  confidence: number; // 0-1
  horizonMinutes: number;
  affectedCorridorIds: string[];
  generatedAt: number;
}

export interface TransitHub {
  id: string;
  name: string;
  lat: number;
  lon: number;
  modes: TransitMode[];
  transferVectors: { toHubId: string; mode: TransitMode }[];
}

export interface Route {
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  mode: TransitMode;
  color: string;
}

export interface Stop {
  stopId: string;
  stopName: string;
  lat: number;
  lon: number;
  mode: TransitMode;
}

export interface SystemStats {
  activeBuses: number;
  activeSkyTrains: number;
  activeSeaBuses: number;
  totalVehicles: number;
  systemEfficiency: number; // 0-100
  avgDelayMinutes: number;
  alertCount: number;
  generatedAt: number;
}
