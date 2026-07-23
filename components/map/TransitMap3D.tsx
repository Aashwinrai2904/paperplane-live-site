"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PathLayer, IconLayer, ColumnLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";

import {
  MAP_CENTER,
  MAP_DEFAULT_BEARING,
  MAP_DEFAULT_PITCH,
  MAP_DEFAULT_ZOOM,
  SEABUS_ROUTE,
  SKYTRAIN_LINES,
  TRANSIT_HUBS,
} from "@/lib/metroVancouverData";
import { BottleneckSegment, CorridorSpeedReading, TransitHub, TransitMode, VehiclePosition } from "@/lib/types";
import { congestionColor, hexToRgb, modeColor } from "@/lib/colors";
import { useSmoothedVehicles } from "./useSmoothedVehicles";
import { createVehicleIconAtlas, IconAtlas } from "./vehicleIcons";

const DARK_BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

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
}

const HUB_BY_ID = new Map(TRANSIT_HUBS.map((h) => [h.id, h]));

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
}: TransitMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [iconAtlas, setIconAtlas] = useState<IconAtlas | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const filteredVehicles = vehicles.filter((v) => visibleModes.has(v.mode));
  const smoothedVehicles = useSmoothedVehicles(filteredVehicles, 10000);

  // --- Map + deck.gl overlay bootstrap -------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setIconAtlas(createVehicleIconAtlas());

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
    if (!map || !mapReady) return;
    if (Math.abs(map.getPitch() - pitch) > 0.5) map.easeTo({ pitch, duration: 300 });
    if (Math.abs(map.getBearing() - bearing) > 0.5) map.easeTo({ bearing, duration: 300 });
  }, [pitch, bearing, mapReady]);

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

  // --- Rebuild deck.gl layers whenever data changes -------------------------
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !iconAtlas) return;

    const layers = [
      // Elevated SkyTrain guideway — glow (wide, translucent) + core (thin, bright)
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
  ]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

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
