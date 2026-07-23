import { CorridorSpeedReading, Route, Stop, TransitHub } from "./types";

// Approximate real-world reference geometry for Metro Vancouver's TransLink
// network. Coordinates are simplified waypoint chains (not full official
// shapefiles) sufficient for a digital-twin visualization.

export const MAP_CENTER: [number, number] = [-123.0989, 49.2606];
export const MAP_DEFAULT_ZOOM = 11.4;
export const MAP_DEFAULT_PITCH = 55;
export const MAP_DEFAULT_BEARING = -18;

export const SKYTRAIN_LINES: {
  routeId: string;
  name: string;
  color: string;
  elevated: boolean;
  path: [number, number][];
}[] = [
  {
    routeId: "EXPO",
    name: "Expo Line",
    color: "#0072CE",
    elevated: true,
    path: [
      [-123.1113, 49.2856], // Waterfront
      [-123.1007, 49.2822], // Burrard
      [-123.1147, 49.2827], // Granville
      [-123.1007, 49.2789], // Stadium-Chinatown
      [-123.0844, 49.2721], // Main St-Science World
      [-123.0754, 49.2707], // Commercial-Broadway
      [-123.0389, 49.2648], // Nanaimo
      [-123.0298, 49.2586], // 29th Ave
      [-123.0038, 49.2258], // Metrotown
      [-122.9926, 49.2166], // Royal Oak
      [-122.9788, 49.2093], // Edmonds
      [-122.9605, 49.2032], // 22nd St
      [-122.9109, 49.2071], // New Westminster
      [-122.9012, 49.2011], // Columbia
      [-122.8988, 49.2488], // Lougheed (branch ref)
    ],
  },
  {
    routeId: "MILLENNIUM",
    name: "Millennium Line",
    color: "#FBC02D",
    elevated: true,
    path: [
      [-123.0754, 49.2707], // Commercial-Broadway
      [-123.0603, 49.2680], // Renfrew
      [-123.0389, 49.2648], // Rupert
      [-123.0038, 49.2554], // Gilmore
      [-122.9986, 49.2564], // Brentwood Town Centre
      [-122.9812, 49.2586], // Holdom
      [-122.9583, 49.2620], // Sperling-Burnaby Lake
      [-122.8988, 49.2488], // Lougheed Town Centre
      [-122.8763, 49.2603], // Burquitlam
      [-122.8493, 49.2622], // Coquitlam Central
      [-122.7963, 49.2734], // Lincoln
      [-122.7815, 49.2779], // Lafarge Lake-Douglas
    ],
  },
  {
    routeId: "CANADA",
    name: "Canada Line",
    color: "#009E49",
    elevated: false,
    path: [
      [-123.1113, 49.2856], // Waterfront
      [-123.1147, 49.2792], // Vancouver City Centre
      [-123.1207, 49.2711], // Yaletown-Roundhouse
      [-123.1219, 49.2622], // Olympic Village
      [-123.1183, 49.2537], // Broadway-City Hall
      [-123.1178, 49.2381], // King Edward
      [-123.1174, 49.2249], // Oakridge-41st
      [-123.1169, 49.2151], // Langara-49th
      [-123.1147, 49.2013], // Marine Drive
      [-123.1339, 49.1785], // Bridgeport
      [-123.1331, 49.1747], // YVR branch
      [-123.1305, 49.1666], // Richmond-Brighouse
    ],
  },
];

export const SEABUS_ROUTE: [number, number][] = [
  [-123.1113, 49.2856], // Waterfront
  [-123.1075, 49.2969],
  [-123.1057, 49.3097], // Lonsdale Quay
];

export const TRANSIT_HUBS: TransitHub[] = [
  {
    id: "waterfront",
    name: "Waterfront Station",
    lat: 49.2856,
    lon: -123.1113,
    modes: ["skytrain", "seabus", "bus"],
    transferVectors: [
      { toHubId: "lonsdale", mode: "seabus" },
      { toHubId: "commercial-broadway", mode: "skytrain" },
    ],
  },
  {
    id: "commercial-broadway",
    name: "Commercial-Broadway Station",
    lat: 49.2707,
    lon: -123.0704,
    modes: ["skytrain", "bus"],
    transferVectors: [
      { toHubId: "waterfront", mode: "skytrain" },
      { toHubId: "lougheed", mode: "skytrain" },
    ],
  },
  {
    id: "lougheed",
    name: "Lougheed Town Centre Station",
    lat: 49.2488,
    lon: -122.8988,
    modes: ["skytrain", "bus"],
    transferVectors: [
      { toHubId: "commercial-broadway", mode: "skytrain" },
      { toHubId: "coquitlam-central", mode: "skytrain" },
    ],
  },
  {
    id: "metrotown",
    name: "Metrotown Station",
    lat: 49.2258,
    lon: -123.0038,
    modes: ["skytrain", "bus"],
    transferVectors: [{ toHubId: "waterfront", mode: "skytrain" }],
  },
  {
    id: "lonsdale",
    name: "Lonsdale Quay",
    lat: 49.3097,
    lon: -123.0824,
    modes: ["seabus", "bus"],
    transferVectors: [{ toHubId: "waterfront", mode: "seabus" }],
  },
  {
    id: "coquitlam-central",
    name: "Coquitlam Central Station",
    lat: 49.2622,
    lon: -122.8493,
    modes: ["skytrain", "bus"],
    transferVectors: [{ toHubId: "lougheed", mode: "skytrain" }],
  },
];

export const CORRIDORS: Omit<
  CorridorSpeedReading,
  "currentSpeedKmh" | "congestionRatio" | "timestamp"
>[] = [
  {
    corridorId: "broadway",
    name: "Broadway Corridor",
    freeFlowSpeedKmh: 45,
    path: [
      [-123.1626, 49.2627],
      [-123.1183, 49.2627],
      [-123.0754, 49.2627],
      [-123.0389, 49.2627],
    ],
  },
  {
    corridorId: "41st-ave",
    name: "41st Avenue",
    freeFlowSpeedKmh: 50,
    path: [
      [-123.1626, 49.2337],
      [-123.1174, 49.2337],
      [-123.0700, 49.2337],
      [-123.0038, 49.2337],
    ],
  },
  {
    corridorId: "hastings",
    name: "Hastings Street",
    freeFlowSpeedKmh: 50,
    path: [
      [-123.1370, 49.2812],
      [-123.0844, 49.2812],
      [-123.0389, 49.2812],
      [-122.9990, 49.2812],
    ],
  },
  {
    corridorId: "highway-1",
    name: "Highway 1 (Trans-Canada)",
    freeFlowSpeedKmh: 100,
    path: [
      [-122.9990, 49.2781],
      [-122.9109, 49.2570],
      [-122.8493, 49.2497],
      [-122.7815, 49.2620],
    ],
  },
  {
    corridorId: "kingsway",
    name: "Kingsway",
    freeFlowSpeedKmh: 50,
    path: [
      [-123.1007, 49.2624],
      [-123.0389, 49.2460],
      [-122.9926, 49.2258],
    ],
  },
  {
    corridorId: "marine-drive",
    name: "Marine Drive",
    freeFlowSpeedKmh: 60,
    path: [
      [-123.1339, 49.2013],
      [-123.0754, 49.2013],
      [-123.0038, 49.1980],
    ],
  },
];

export const BUS_ROUTES: {
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  path: [number, number][];
  corridorId: string;
}[] = [
  {
    routeId: "099",
    routeShortName: "099",
    routeLongName: "B-Line Commercial-Broadway/UBC",
    corridorId: "broadway",
    path: [
      [-123.0754, 49.2707],
      [-123.1183, 49.2627],
      [-123.1626, 49.2627],
      [-123.2489, 49.2606],
    ],
  },
  {
    routeId: "041",
    routeShortName: "041",
    routeLongName: "41st Ave / Joyce Station",
    corridorId: "41st-ave",
    path: [
      [-123.1626, 49.2337],
      [-123.1174, 49.2337],
      [-123.0700, 49.2337],
      [-123.0038, 49.2258],
    ],
  },
  {
    routeId: "095",
    routeShortName: "095",
    routeLongName: "SFU / Hastings",
    corridorId: "hastings",
    path: [
      [-123.1370, 49.2812],
      [-123.0844, 49.2812],
      [-123.0389, 49.2812],
      [-122.9187, 49.2781],
    ],
  },
  {
    routeId: "160",
    routeShortName: "160",
    routeLongName: "Coquitlam Station / Metrotown",
    corridorId: "kingsway",
    path: [
      [-123.0038, 49.2258],
      [-122.9926, 49.2258],
      [-122.9109, 49.2570],
      [-122.8493, 49.2622],
    ],
  },
];

export const ROUTES: Route[] = [
  { routeId: "EXPO", routeShortName: "EXPO", routeLongName: "Expo Line", mode: "skytrain", color: "#0072CE" },
  { routeId: "MILLENNIUM", routeShortName: "MLNM", routeLongName: "Millennium Line", mode: "skytrain", color: "#FBC02D" },
  { routeId: "CANADA", routeShortName: "CNDA", routeLongName: "Canada Line", mode: "skytrain", color: "#009E49" },
  { routeId: "SEABUS", routeShortName: "SEA", routeLongName: "SeaBus", mode: "seabus", color: "#26C6DA" },
  ...BUS_ROUTES.map((r) => ({
    routeId: r.routeId,
    routeShortName: r.routeShortName,
    routeLongName: r.routeLongName,
    mode: "bus" as const,
    color: "#4FC3F7",
  })),
];

export const STOPS: Stop[] = TRANSIT_HUBS.map((h) => ({
  stopId: h.id,
  stopName: h.name,
  lat: h.lat,
  lon: h.lon,
  mode: h.modes.includes("skytrain") ? "skytrain" : h.modes[0],
}));
