"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState, useCallback, useMemo, type MutableRefObject } from "react";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PathLayer, IconLayer, ColumnLayer, ScatterplotLayer, BitmapLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import type { PickingInfo } from "@deck.gl/core";

import {
  MAP_CENTER,
  MAP_DEFAULT_BEARING,
  MAP_DEFAULT_PITCH,
  MAP_DEFAULT_ZOOM,
  SEABUS_ROUTE,
  SKYTRAIN_LINES,
  BUS_ROUTES,
  TRANSIT_HUBS,
} from "@/lib/metroVancouverData";
import { buildGisDatasets, GisLayerId, TRAFFIC_CAMERAS, TrafficCameraLocation } from "@/lib/gisData";
import { BottleneckSegment, CorridorSpeedReading, ServiceAlert, TransitHub, TransitMode, VehiclePosition } from "@/lib/types";
import { congestionColor, hexToRgb, modeColor } from "@/lib/colors";
import { computeCameraParams, CameraTrackingMode } from "@/lib/cameraTracking";
import { fetchLatestRadarTileTemplate } from "@/lib/rainviewer";
import { useSmoothedVehicles } from "./useSmoothedVehicles";
import { createVehicleIconAtlas, IconAtlas } from "./vehicleIcons";

const DARK_BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export interface TransitMap3DHandle {
  flyTo: (lon: number, lat: number, zoom?: number) => void;
  fitBounds: (positions: [number, number][]) => void;
}

export interface TransitMap3DProps {
  vehicles: VehiclePosition[];
  corridors: CorridorSpeedReading[];
  bottlenecks: BottleneckSegment[];
  visibleModes: Set<TransitMode>;
  showCrowdDensity: boolean;
  showCorridorFusion: boolean;
  pitch: number;
  bearing: number;
  onViewChange: (view: { pitch: number; bearing: number }) => void;
  onSelectVehicle: (vehicle: VehiclePosition) => void;
  onSelectHub: (hub: TransitHub) => void;
  gisLayerVisibility: Record<GisLayerId, boolean>;
  userLocation: { lat: number; lon: number } | null;
  followVehicleId: string | null;
  cameraMode: CameraTrackingMode;
  showPrecipitation: boolean;
  showEvents: boolean;
  showLiveCameras: boolean;
  alerts: ServiceAlert[];
  onSelectCamera: (camera: TrafficCameraLocation) => void;
  apiRef?: MutableRefObject<TransitMap3DHandle | null>;
}

const HUB_BY_ID = new Map(TRANSIT_HUBS.map((h) => [h.id, h]));
const GIS_DATASETS = buildGisDatasets();
const GIS_DATASET_BY_LAYER: Partial<Record<GisLayerId, (typeof GIS_DATASETS)[number]>> = {
  stations: GIS_DATASETS.find((d) => d.id === "stations"),
  busExchanges: GIS_DATASETS.find((d) => d.id === "busExchanges"),
  stops: GIS_DATASETS.find((d) => d.id === "stops"),
  bikeParkades: GIS_DATASETS.find((d) => d.id === "bikeParkades"),
  otherTransportation: GIS_DATASETS.find((d) => d.id === "otherTransportation"),
};

export default function TransitMap3D({
  vehicles,
  corridors,
  bottlenecks,
  visibleModes,
  showCrowdDensity,
  showCorridorFusion,
  pitch,
  bearing,
  onViewChange,
  onSelectVehicle,
  onSelectHub,
  gisLayerVisibility,
  userLocation,
  followVehicleId,
  cameraMode,
  showPrecipitation,
  showEvents,
  showLiveCameras,
  alerts,
  onSelectCamera,
  apiRef,
}: TransitMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [iconAtlas, setIconAtlas] = useState<IconAtlas | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [radarTileTemplate, setRadarTileTemplate] = useState<string | null>(null);

  const filteredVehicles = vehicles.filter((v) => visibleModes.has(v.mode));
  const smoothedVehicles = useSmoothedVehicles(filteredVehicles, 10000);

  // Exposed imperatively via a plain ref prop rather than React's ref/
  // forwardRef mechanism, since next/dynamic's loading wrapper does not
  // forward refs through to the lazily-loaded component.
  if (apiRef) {
    apiRef.current = {
      flyTo: (lon, lat, zoom = 15.5) => {
        mapRef.current?.flyTo({ center: [lon, lat], zoom, duration: 1200 });
      },
      fitBounds: (positions) => {
        const map = mapRef.current;
        if (!map || positions.length === 0) return;
        if (positions.length === 1) {
          map.flyTo({ center: positions[0], zoom: 15.5, duration: 1200 });
          return;
        }
        const lons = positions.map((p) => p[0]);
        const lats = positions.map((p) => p[1]);
        map.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: 80, duration: 1200, maxZoom: 16 }
        );
      },
    };
  }

  // --- Map + deck.gl overlay bootstrap -------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setIconAtlas(createVehicleIconAtlas());
    fetchLatestRadarTileTemplate().then(setRadarTileTemplate);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_BASEMAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
      pitch: MAP_DEFAULT_PITCH,
      bearing: MAP_DEFAULT_BEARING,
      antialias: true,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);
    overlayRef.current = overlay;

    const syncView = () => {
      onViewChange({ pitch: map.getPitch(), bearing: map.getBearing() });
    };
    map.on("pitchend", syncView);
    map.on("rotateend", syncView);
    map.on("load", () => setMapReady(true));

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- External pitch/bearing control (from ControlPanel sliders) ---------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || followVehicleId) return;
    if (Math.abs(map.getPitch() - pitch) > 0.5) map.easeTo({ pitch, duration: 300 });
    if (Math.abs(map.getBearing() - bearing) > 0.5) map.easeTo({ bearing, duration: 300 });
  }, [pitch, bearing, mapReady, followVehicleId]);

  // --- 3D camera tracking modes (Mini Tokyo 3D-style vehicle follow) ------
  const followStateRef = useRef({ id: followVehicleId, mode: cameraMode });
  useEffect(() => {
    followStateRef.current = { id: followVehicleId, mode: cameraMode };
  }, [followVehicleId, cameraMode]);

  const vehiclesRef = useRef<VehiclePosition[]>(smoothedVehicles);
  useEffect(() => {
    vehiclesRef.current = smoothedVehicles;
  }, [smoothedVehicles]);

  useEffect(() => {
    let raf = 0;
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      const map = mapRef.current;
      const { id, mode } = followStateRef.current;
      if (map && id) {
        const vehicle = vehiclesRef.current.find((v) => v.id === id);
        if (vehicle) {
          const params = computeCameraParams(mode, vehicle.bearing, performance.now());
          map.jumpTo({
            center: [vehicle.lon, vehicle.lat],
            pitch: params.pitch,
            bearing: params.bearing,
            zoom: params.zoom,
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleVehicleClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) onSelectVehicle(info.object as VehiclePosition);
    },
    [onSelectVehicle]
  );

  const handleHubClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) onSelectHub(info.object as TransitHub);
    },
    [onSelectHub]
  );

  const handleCameraClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) onSelectCamera(info.object as TrafficCameraLocation);
    },
    [onSelectCamera]
  );

  const alertsWithPosition = useMemo(
    () => alerts.filter((a): a is ServiceAlert & { lat: number; lon: number } => a.lat != null && a.lon != null),
    [alerts]
  );

  // --- Rebuild deck.gl layers whenever data changes -------------------------
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !iconAtlas) return;

    const layers = [
      // Precipitation radar (RainViewer public tiles)
      ...(showPrecipitation && radarTileTemplate
        ? [
            new TileLayer({
              id: "precipitation-radar",
              data: radarTileTemplate,
              minZoom: 0,
              maxZoom: 12,
              tileSize: 256,
              opacity: 0.45,
              renderSubLayers: (props) => {
                const { bbox } = props.tile;
                const b = bbox as { west: number; south: number; east: number; north: number };
                return new BitmapLayer(props, {
                  data: undefined,
                  image: props.data,
                  bounds: [b.west, b.south, b.east, b.north],
                });
              },
            }),
          ]
        : []),
      // Elevated SkyTrain guideway — glow (wide, translucent) + core (thin, bright)
      ...(gisLayerVisibility.linesRapidTransit
        ? [
            new PathLayer({
              id: "skytrain-glow",
              data: SKYTRAIN_LINES,
              getPath: (d) => d.path,
              getColor: (d) => hexToRgb(d.color, 70),
              getWidth: 26,
              widthMinPixels: 6,
              capRounded: true,
              jointRounded: true,
            }),
            new PathLayer({
              id: "skytrain-guides",
              data: SKYTRAIN_LINES,
              getPath: (d) => d.path,
              getColor: (d) => hexToRgb(d.color, 235),
              getWidth: 6,
              widthMinPixels: 2,
              capRounded: true,
              jointRounded: true,
            }),
            // SeaBus water transit vector
            new PathLayer({
              id: "seabus-glow",
              data: [{ path: SEABUS_ROUTE }],
              getPath: (d) => d.path,
              getColor: [38, 198, 218, 60],
              getWidth: 22,
              widthMinPixels: 5,
            }),
            new PathLayer({
              id: "seabus-route",
              data: [{ path: SEABUS_ROUTE }],
              getPath: (d) => d.path,
              getColor: [38, 198, 218, 220],
              getWidth: 4,
              widthMinPixels: 1.5,
            }),
          ]
        : []),
      // Regular bus route lines ("Lines" layer, includes non-rapid-transit service)
      ...(gisLayerVisibility.lines
        ? [
            new PathLayer({
              id: "bus-route-lines",
              data: BUS_ROUTES,
              getPath: (d) => d.path,
              getColor: [79, 195, 247, 150],
              getWidth: 3,
              widthMinPixels: 1,
              capRounded: true,
            }),
          ]
        : []),
      // Corridor bottleneck diagnostics — congestion-colored road vectors
      new PathLayer({
        id: "corridor-speeds",
        data: corridors,
        getPath: (d) => d.path,
        getColor: (d) => congestionColor(d.congestionRatio, 200),
        getWidth: (d) => (d.congestionRatio < 0.3 ? 10 : d.congestionRatio < 0.55 ? 7 : 4),
        widthMinPixels: 2,
        capRounded: true,
      }),
      // Multimodal corridor fusion — transfer vectors between key hubs
      ...(showCorridorFusion
        ? [
            new PathLayer({
              id: "hub-transfer-vectors",
              data: TRANSIT_HUBS.flatMap((hub) =>
                hub.transferVectors.map((tv) => {
                  const target = HUB_BY_ID.get(tv.toHubId);
                  return target
                    ? { path: [[hub.lon, hub.lat], [target.lon, target.lat]] as [number, number][], mode: tv.mode }
                    : null;
                })
              ).filter((d): d is { path: [number, number][]; mode: TransitMode } => d !== null),
              getPath: (d) => d.path,
              getColor: (d) => modeColor(d.mode, 140),
              getWidth: 3,
              widthMinPixels: 1,
            }),
          ]
        : []),
      // Crowd density halos (Feature 2) — extruded columns colored by load
      ...(showCrowdDensity
        ? [
            new ColumnLayer({
              id: "crowd-density",
              data: smoothedVehicles,
              diskResolution: 16,
              radius: 55,
              extruded: true,
              elevationScale: 1,
              getPosition: (d) => [d.lon, d.lat],
              getFillColor: (d) => {
                const [r, g, b] = crowdRgb(d.crowdLevel);
                return [r, g, b, 90];
              },
              getElevation: (d) => 40 + d.occupancyRatio * 260,
              getRadius: (d: VehiclePosition) => 45 + d.occupancyRatio * 55,
              pickable: false,
            }),
          ]
        : []),
      // Vehicle markers
      new IconLayer({
        id: "vehicles",
        data: smoothedVehicles,
        iconAtlas: iconAtlas.atlas,
        iconMapping: iconAtlas.mapping,
        getIcon: (d) => d.mode,
        getPosition: (d) => [d.lon, d.lat],
        getSize: 30,
        sizeUnits: "pixels",
        getColor: (d) => modeColor(d.mode),
        getAngle: (d) => (d.mode === "seabus" ? 0 : 360 - d.bearing),
        pickable: true,
        onClick: handleVehicleClick,
      }),
      // Transit hub markers
      new IconLayer({
        id: "hubs",
        data: TRANSIT_HUBS,
        iconAtlas: iconAtlas.atlas,
        iconMapping: iconAtlas.mapping,
        getIcon: () => "hub",
        getPosition: (d) => [d.lon, d.lat],
        getSize: 22,
        sizeUnits: "pixels",
        getColor: [226, 232, 240, 230],
        pickable: true,
        onClick: handleHubClick,
      }),
      // Severe bottleneck emphasis ring
      new PathLayer({
        id: "bottleneck-emphasis",
        data: bottlenecks.filter((b) => b.severity === "severe"),
        getPath: (d) => d.path,
        getColor: [248, 113, 113, 255],
        getWidth: 3,
        widthMinPixels: 1,
      }),
      // GIS reference layers (Stations, Bus Exchanges, Stops, Bike Parkades, Other Transportation)
      ...(Object.entries(GIS_DATASET_BY_LAYER) as [GisLayerId, (typeof GIS_DATASETS)[number] | undefined][])
        .filter(([layerId, dataset]) => gisLayerVisibility[layerId] && dataset)
        .map(
          ([layerId, dataset]) =>
            new ScatterplotLayer({
              id: `gis-${layerId}`,
              data: dataset!.rows,
              getPosition: (d) => dataset!.getPosition(d),
              getRadius: 6,
              radiusMinPixels: 3,
              radiusMaxPixels: 8,
              getFillColor: GIS_LAYER_COLOR[layerId],
              getLineColor: [15, 23, 42, 255],
              lineWidthMinPixels: 1,
              stroked: true,
              pickable: false,
            })
        ),
      // Events overlay — service alert locations
      ...(showEvents
        ? [
            new IconLayer({
              id: "events",
              data: alertsWithPosition,
              iconAtlas: iconAtlas.atlas,
              iconMapping: iconAtlas.mapping,
              getIcon: () => "hub",
              getPosition: (d) => [d.lon, d.lat],
              getSize: 20,
              sizeUnits: "pixels",
              getColor: (d) => (d.severity === "severe" ? [248, 113, 113, 255] : [251, 191, 36, 255]),
              pickable: false,
            }),
          ]
        : []),
      // Live traffic camera markers
      ...(showLiveCameras
        ? [
            new ScatterplotLayer({
              id: "traffic-cameras",
              data: TRAFFIC_CAMERAS,
              getPosition: (d) => [d.lon, d.lat],
              getRadius: 8,
              radiusMinPixels: 4,
              radiusMaxPixels: 10,
              getFillColor: [15, 23, 42, 220],
              getLineColor: [255, 255, 255, 220],
              lineWidthMinPixels: 1.5,
              stroked: true,
              pickable: true,
              onClick: handleCameraClick,
            }),
          ]
        : []),
      // User location marker
      ...(userLocation
        ? [
            new ScatterplotLayer({
              id: "user-location-halo",
              data: [userLocation],
              getPosition: (d) => [d.lon, d.lat],
              getRadius: 60,
              getFillColor: [79, 195, 247, 60],
              pickable: false,
            }),
            new ScatterplotLayer({
              id: "user-location-dot",
              data: [userLocation],
              getPosition: (d) => [d.lon, d.lat],
              getRadius: 8,
              radiusMinPixels: 5,
              getFillColor: [79, 195, 247, 255],
              getLineColor: [255, 255, 255, 255],
              lineWidthMinPixels: 2,
              stroked: true,
              pickable: false,
            }),
          ]
        : []),
    ];

    overlay.setProps({ layers });
  }, [
    smoothedVehicles,
    corridors,
    bottlenecks,
    iconAtlas,
    showCrowdDensity,
    showCorridorFusion,
    handleVehicleClick,
    handleHubClick,
    handleCameraClick,
    gisLayerVisibility,
    userLocation,
    showPrecipitation,
    radarTileTemplate,
    showEvents,
    showLiveCameras,
    alertsWithPosition,
  ]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

const GIS_LAYER_COLOR: Record<GisLayerId, [number, number, number, number]> = {
  stations: [15, 23, 42, 255],
  busExchanges: [100, 116, 139, 255],
  stops: [148, 163, 184, 220],
  bikeParkades: [52, 211, 153, 230],
  linesRapidTransit: [255, 255, 255, 255],
  lines: [255, 255, 255, 255],
  otherTransportation: [167, 139, 250, 230],
};

function crowdRgb(level: VehiclePosition["crowdLevel"]): [number, number, number] {
  switch (level) {
    case "low":
      return [52, 211, 153];
    case "moderate":
      return [251, 191, 36];
    case "high":
      return [248, 113, 113];
  }
}
