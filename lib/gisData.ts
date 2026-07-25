import { SKYTRAIN_LINES, BUS_ROUTES, TRANSIT_HUBS } from "./metroVancouverData";

// Supplementary GIS reference data — bike parkades, bus exchanges, depots,
// and other-transportation connection points — modeled after the categories
// in TransLink's public "System Map" ArcGIS application. Coordinates are
// simplified placements anchored to our existing route/station geometry
// (not official TransLink asset locations), consistent with the rest of
// this app's deterministic mock dataset.

export interface TrafficCameraLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  corridorId: string;
}

export const TRAFFIC_CAMERAS: TrafficCameraLocation[] = [
  { id: "cam-broadway", name: "Broadway & Commercial", lat: 49.2627, lon: -123.0754, corridorId: "broadway" },
  { id: "cam-hastings", name: "Hastings & Nanaimo", lat: 49.2812, lon: -123.0389, corridorId: "hastings" },
  { id: "cam-hwy1", name: "Highway 1 @ Brunette", lat: 49.2497, lon: -122.8493, corridorId: "highway-1" },
  { id: "cam-41st", name: "41st Ave & Oak", lat: 49.2337, lon: -123.1174, corridorId: "41st-ave" },
];

export type GisLayerId =
  | "stations"
  | "busExchanges"
  | "stops"
  | "bikeParkades"
  | "linesRapidTransit"
  | "lines"
  | "otherTransportation";

export interface GisColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export interface GisDataset<T extends Record<string, string | number> = Record<string, string | number>> {
  id: string;
  label: string;
  columns: GisColumn[];
  rows: T[];
  getPosition: (row: T) => [number, number];
  nameKey: string;
}

// --- Stations (deduplicated across the three SkyTrain lines) --------------

interface StationRow extends Record<string, string | number> {
  objectId: number;
  stationName: string;
  line: string;
  type: "Station";
  lon: number;
  lat: number;
}

export const STATION_NAMES: Record<string, string[]> = {
  EXPO: [
    "Waterfront", "Burrard", "Granville", "Stadium-Chinatown", "Main St-Science World",
    "Commercial-Broadway", "Nanaimo", "29th Avenue", "Metrotown", "Royal Oak",
    "Edmonds", "22nd Street", "New Westminster", "Columbia", "Lougheed Town Centre",
  ],
  MILLENNIUM: [
    "Commercial-Broadway", "Renfrew", "Rupert", "Gilmore", "Brentwood Town Centre",
    "Holdom", "Sperling-Burnaby Lake", "Lougheed Town Centre", "Burquitlam",
    "Coquitlam Central", "Lincoln", "Lafarge Lake-Douglas",
  ],
  CANADA: [
    "Waterfront", "Vancouver City Centre", "Yaletown-Roundhouse", "Olympic Village",
    "Broadway-City Hall", "King Edward", "Oakridge-41st Avenue", "Langara-49th Avenue",
    "Marine Drive", "Bridgeport", "YVR-Airport", "Richmond-Brighouse",
  ],
};

const stationMap = new Map<string, StationRow>();
let stationSeq = 880;
for (const line of SKYTRAIN_LINES) {
  line.path.forEach(([lon, lat], i) => {
    const key = `${lon.toFixed(4)},${lat.toFixed(4)}`;
    const existing = stationMap.get(key);
    if (existing) {
      if (!existing.line.includes(line.name)) existing.line = `${existing.line} / ${line.name}`;
      return;
    }
    stationMap.set(key, {
      objectId: stationSeq++,
      stationName: STATION_NAMES[line.routeId]?.[i] ?? `${line.name} Station ${i + 1}`,
      line: line.name,
      type: "Station",
      lon,
      lat,
    });
  });
}

export const STATIONS: StationRow[] = Array.from(stationMap.values());

// --- Bus Exchanges ----------------------------------------------------------

interface ExchangeRow extends Record<string, string | number> {
  objectId: number;
  exchangeName: string;
  exchangeArea: string;
  yearOpened: number;
  buildType: "On-Street" | "Off-Street";
  type: "Exchange" | "Loop";
  lon: number;
  lat: number;
}

export const BUS_EXCHANGES: ExchangeRow[] = [
  { objectId: 1800, exchangeName: "Lougheed", exchangeArea: "Burnaby", yearOpened: 1985, buildType: "Off-Street", type: "Exchange", lon: -122.8988, lat: 49.2488 },
  { objectId: 1801, exchangeName: "Lonsdale Quay", exchangeArea: "North Vancouver", yearOpened: 1986, buildType: "Off-Street", type: "Exchange", lon: -123.0824, lat: 49.3097 },
  { objectId: 1802, exchangeName: "Coquitlam Central", exchangeArea: "Coquitlam", yearOpened: 2016, buildType: "Off-Street", type: "Exchange", lon: -122.8493, lat: 49.2622 },
  { objectId: 1803, exchangeName: "Metrotown", exchangeArea: "Burnaby", yearOpened: 1990, buildType: "Off-Street", type: "Loop", lon: -123.0038, lat: 49.2258 },
  { objectId: 1804, exchangeName: "22nd Street", exchangeArea: "New Westminster", yearOpened: 1989, buildType: "On-Street", type: "Exchange", lon: -122.9605, lat: 49.2032 },
  { objectId: 1805, exchangeName: "New Westminster", exchangeArea: "New Westminster", yearOpened: 1994, buildType: "Off-Street", type: "Exchange", lon: -122.9109, lat: 49.2071 },
];

// --- Bike Parkades ----------------------------------------------------------

interface BikeParkadeRow extends Record<string, string | number> {
  objectId: number;
  parkadeName: string;
  location: string;
  capacity: number;
  lon: number;
  lat: number;
}

export const BIKE_PARKADES: BikeParkadeRow[] = [
  { objectId: 1, parkadeName: "Waterfront Bike Parkade", location: "Waterfront Station", capacity: 212, lon: -123.1103, lat: 49.2852 },
  { objectId: 2, parkadeName: "Commercial-Broadway Bike Parkade", location: "Commercial-Broadway Station", capacity: 156, lon: -123.0744, lat: 49.2703 },
  { objectId: 3, parkadeName: "Metrotown Bike Parkade", location: "Metrotown Station", capacity: 98, lon: -123.0028, lat: 49.2254 },
  { objectId: 4, parkadeName: "Lougheed Bike Parkade", location: "Lougheed Town Centre Station", capacity: 84, lon: -122.8978, lat: 49.2484 },
  { objectId: 5, parkadeName: "New Westminster Bike Parkade", location: "New Westminster Station", capacity: 72, lon: -122.9099, lat: 49.2067 },
  { objectId: 6, parkadeName: "Richmond-Brighouse Bike Parkade", location: "Richmond-Brighouse Station", capacity: 60, lon: -123.1295, lat: 49.1662 },
];

// --- Other Transportation (ferries, airport, BC Transit, depots) ----------

interface OtherTransportationRow extends Record<string, string | number> {
  objectId: number;
  placeName: string;
  location: string;
  connectionType: "Ferry" | "Airport" | "BC Transit" | "Bus Depot";
  lon: number;
  lat: number;
}

export const OTHER_TRANSPORTATION: OtherTransportationRow[] = [
  { objectId: 100, placeName: "Horseshoe Bay Terminal", location: "West Vancouver", connectionType: "Ferry", lon: -123.2725, lat: 49.3758 },
  { objectId: 101, placeName: "Tsawwassen Terminal", location: "Delta", connectionType: "Ferry", lon: -123.1310, lat: 49.0069 },
  { objectId: 102, placeName: "Vancouver International Airport", location: "Richmond", connectionType: "Airport", lon: -123.1815, lat: 49.1967 },
  { objectId: 103, placeName: "Fraser Valley Connection", location: "Langley", connectionType: "BC Transit", lon: -122.7815, lat: 49.2779 },
  { objectId: 104, placeName: "Oakridge Transit Centre", location: "Vancouver", connectionType: "Bus Depot", lon: -123.1220, lat: 49.2280 },
  { objectId: 105, placeName: "Burnaby Transit Centre", location: "Burnaby", connectionType: "Bus Depot", lon: -122.9700, lat: 49.2470 },
];

// --- Stops (sampled from bus route geometry + hubs) ------------------------

interface StopRow extends Record<string, string | number> {
  objectId: number;
  stopNumber: number;
  stopName: string;
  routes: string;
  lon: number;
  lat: number;
}

let stopSeq = 106868;
let stopNumberSeq = 52101;
export const STOPS_TABLE: StopRow[] = BUS_ROUTES.flatMap((route) =>
  route.path.map(([lon, lat], i) => ({
    objectId: stopSeq++,
    stopNumber: stopNumberSeq++,
    stopName: `${route.routeLongName} — Stop ${i + 1}`,
    routes: route.routeShortName,
    lon,
    lat,
  }))
).concat(
  TRANSIT_HUBS.map((h) => ({
    objectId: stopSeq++,
    stopNumber: stopNumberSeq++ + 900,
    stopName: h.name,
    routes: h.modes.join("; "),
    lon: h.lon,
    lat: h.lat,
  }))
);

// --- Lines / Lines - Rapid Transit Only ------------------------------------

interface LineRow extends Record<string, string | number> {
  objectId: number;
  lineNo: string;
  lineName: string;
  lineType: string;
}

export const RAPID_TRANSIT_LINES: LineRow[] = [
  ...SKYTRAIN_LINES.map((l, i) => ({ objectId: 3050 + i, lineNo: l.routeId, lineName: l.name, lineType: "SkyTrain" })),
  { objectId: 3060, lineNo: "SEA", lineName: "SeaBus", lineType: "SeaBus" },
  ...BUS_ROUTES.map((r, i) => ({ objectId: 3070 + i, lineNo: r.routeShortName, lineName: r.routeLongName, lineType: "RapidBus / B-Line" })),
];

export const ALL_LINES: LineRow[] = RAPID_TRANSIT_LINES;

// --- SMA Metadata (field dictionary) ---------------------------------------

interface SmaMetadataRow extends Record<string, string | number> {
  objectId: number;
  table: string;
  attributeName: string;
  description: string;
  fieldOrder: number;
}

export const SMA_METADATA: SmaMetadataRow[] = [
  { objectId: 1, table: "Stations", attributeName: "line", description: "Name of the rapid transit line(s) serving the station", fieldOrder: 1 },
  { objectId: 2, table: "Stations", attributeName: "stationName", description: "Public-facing station name", fieldOrder: 2 },
  { objectId: 3, table: "Bus Exchanges", attributeName: "buildType", description: "On-Street or Off-Street exchange construction", fieldOrder: 1 },
  { objectId: 4, table: "Bus Exchanges", attributeName: "yearOpened", description: "Year the exchange first opened for service", fieldOrder: 2 },
  { objectId: 5, table: "Stops", attributeName: "routes", description: "Route short names served at this stop", fieldOrder: 1 },
  { objectId: 6, table: "Bike Parkades", attributeName: "capacity", description: "Total secure bike parking spaces", fieldOrder: 1 },
  { objectId: 7, table: "Lines", attributeName: "lineType", description: "Service category (SkyTrain, SeaBus, RapidBus / B-Line)", fieldOrder: 1 },
  { objectId: 8, table: "Other Transportation", attributeName: "connectionType", description: "Ferry, Airport, BC Transit, or Bus Depot connection", fieldOrder: 1 },
];

// --- Assembled datasets for the data table / layers UI ---------------------

export function buildGisDatasets(): GisDataset[] {
  return [
    {
      id: "stations",
      label: "Stations",
      columns: [
        { key: "objectId", label: "OBJECTID", numeric: true },
        { key: "stationName", label: "Station" },
        { key: "line", label: "Line" },
        { key: "type", label: "Type" },
      ],
      rows: STATIONS,
      getPosition: (r) => [r.lon as number, r.lat as number],
      nameKey: "stationName",
    },
    {
      id: "busExchanges",
      label: "Bus Exchanges",
      columns: [
        { key: "objectId", label: "OBJECTID", numeric: true },
        { key: "exchangeName", label: "Exchange" },
        { key: "exchangeArea", label: "Area" },
        { key: "yearOpened", label: "Year Opened", numeric: true },
        { key: "buildType", label: "Build Type" },
        { key: "type", label: "Type" },
      ],
      rows: BUS_EXCHANGES,
      getPosition: (r) => [r.lon as number, r.lat as number],
      nameKey: "exchangeName",
    },
    {
      id: "stops",
      label: "Stops",
      columns: [
        { key: "objectId", label: "OBJECTID", numeric: true },
        { key: "stopNumber", label: "Stop #", numeric: true },
        { key: "stopName", label: "Stop Name" },
        { key: "routes", label: "Routes" },
      ],
      rows: STOPS_TABLE,
      getPosition: (r) => [r.lon as number, r.lat as number],
      nameKey: "stopName",
    },
    {
      id: "bikeParkades",
      label: "Bike Parkades",
      columns: [
        { key: "objectId", label: "OBJECTID", numeric: true },
        { key: "parkadeName", label: "Parkade" },
        { key: "location", label: "Location" },
        { key: "capacity", label: "Capacity", numeric: true },
      ],
      rows: BIKE_PARKADES,
      getPosition: (r) => [r.lon as number, r.lat as number],
      nameKey: "parkadeName",
    },
    {
      id: "linesRapidTransit",
      label: "Lines - Rapid Transit Only",
      columns: [
        { key: "objectId", label: "OBJECTID", numeric: true },
        { key: "lineNo", label: "Line No" },
        { key: "lineName", label: "Line Name" },
        { key: "lineType", label: "Type" },
      ],
      rows: RAPID_TRANSIT_LINES.filter((l) => l.lineType !== "RapidBus / B-Line"),
      getPosition: () => [-123.0989, 49.2606],
      nameKey: "lineName",
    },
    {
      id: "lines",
      label: "Lines",
      columns: [
        { key: "objectId", label: "OBJECTID", numeric: true },
        { key: "lineNo", label: "Line No" },
        { key: "lineName", label: "Line Name" },
        { key: "lineType", label: "Type" },
      ],
      rows: ALL_LINES,
      getPosition: () => [-123.0989, 49.2606],
      nameKey: "lineName",
    },
    {
      id: "otherTransportation",
      label: "Other Transportation",
      columns: [
        { key: "objectId", label: "OBJECTID", numeric: true },
        { key: "placeName", label: "Place" },
        { key: "location", label: "Location" },
        { key: "connectionType", label: "Connection Type" },
      ],
      rows: OTHER_TRANSPORTATION,
      getPosition: (r) => [r.lon as number, r.lat as number],
      nameKey: "placeName",
    },
    {
      id: "smaMetadata",
      label: "SMA Metadata",
      columns: [
        { key: "objectId", label: "OBJECTID", numeric: true },
        { key: "table", label: "Table" },
        { key: "attributeName", label: "Attribute" },
        { key: "description", label: "Description" },
        { key: "fieldOrder", label: "Field Order", numeric: true },
      ],
      rows: SMA_METADATA,
      getPosition: () => [-123.0989, 49.2606],
      nameKey: "attributeName",
    },
  ];
}
