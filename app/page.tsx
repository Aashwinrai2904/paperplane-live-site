"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import Header from "@/components/ui/Header";
import ControlPanel from "@/components/ui/ControlPanel";
import DisruptionBanner from "@/components/ui/DisruptionBanner";
import AnalyticsDrawer from "@/components/ui/AnalyticsDrawer";
import NodeDrawer from "@/components/ui/NodeDrawer";
import GisToolbar from "@/components/gis/GisToolbar";
import LayersModal from "@/components/gis/LayersModal";
import LegendModal from "@/components/gis/LegendModal";
import AboutModal from "@/components/gis/AboutModal";
import DataTablePanel from "@/components/gis/DataTablePanel";
import OverlayLayersMenu from "@/components/gis/OverlayLayersMenu";
import LiveCameraModal from "@/components/gis/LiveCameraModal";
import CameraTrackingPanel from "@/components/gis/CameraTrackingPanel";
import VehicleInspectorPanel from "@/components/gis/VehicleInspectorPanel";

import { predictDelays, detectBottlenecks } from "@/lib/delayPredictor";
import { computeSystemStats } from "@/lib/translink";
import { MAP_DEFAULT_BEARING, MAP_DEFAULT_PITCH } from "@/lib/metroVancouverData";
import { buildGisDatasets, GisLayerId, TrafficCameraLocation } from "@/lib/gisData";
import { CameraTrackingMode } from "@/lib/cameraTracking";
import {
  BottleneckSegment,
  CorridorSpeedReading,
  ServiceAlert,
  TransitHub,
  TransitMode,
  TsprStopStat,
  VehiclePosition,
} from "@/lib/types";
import type { TransitMap3DHandle } from "@/components/map/TransitMap3D";

const TransitMap3D = dynamic(() => import("@/components/map/TransitMap3D"), {
  ssr: false,
  loading: () => <MapLoadingOverlay />,
});

const VEHICLE_POLL_MS = 10_000;
const CORRIDOR_POLL_MS = 15_000;
const ALERT_POLL_MS = 30_000;
const ALL_MODES: TransitMode[] = ["bus", "skytrain", "seabus"];
const ALL_GIS_LAYERS: GisLayerId[] = [
  "stations",
  "busExchanges",
  "stops",
  "bikeParkades",
  "linesRapidTransit",
  "lines",
  "otherTransportation",
];

function defaultGisVisibility(): Record<GisLayerId, boolean> {
  return Object.fromEntries(ALL_GIS_LAYERS.map((id) => [id, id === "linesRapidTransit"])) as Record<
    GisLayerId,
    boolean
  >;
}

export default function Home() {
  const mapRef = useRef<TransitMap3DHandle | null>(null);
  const gisDatasets = useMemo(() => buildGisDatasets(), []);

  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [summarizedAlerts, setSummarizedAlerts] = useState<ServiceAlert[]>([]);
  const [corridors, setCorridors] = useState<CorridorSpeedReading[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckSegment[]>([]);
  const [tsprStats, setTsprStats] = useState<TsprStopStat[]>([]);
  const [live, setLive] = useState(false);
  const [rtdsLive, setRtdsLive] = useState(false);
  const [tsprLive, setTsprLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [visibleModes, setVisibleModes] = useState<Set<TransitMode>>(new Set(ALL_MODES));
  const [showCrowdDensity, setShowCrowdDensity] = useState(true);
  const [showCorridorFusion, setShowCorridorFusion] = useState(true);
  const [pitch, setPitch] = useState(MAP_DEFAULT_PITCH);
  const [bearing, setBearing] = useState(MAP_DEFAULT_BEARING);

  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null);
  const [selectedHub, setSelectedHub] = useState<TransitHub | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // --- GIS toolbar state ----------------------------------------------------
  const [gisLayerVisibility, setGisLayerVisibility] = useState<Record<GisLayerId, boolean>>(defaultGisVisibility);
  const [layersOpen, setLayersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const [showPrecipitation, setShowPrecipitation] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [showLiveCameras, setShowLiveCameras] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<TrafficCameraLocation | null>(null);

  const [followVehicleId, setFollowVehicleId] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraTrackingMode>("topBack");

  // --- Live data polling -----------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/translink/gtfs-rt", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setVehicles(data.vehicles ?? []);
        setAlerts(data.alerts ?? []);
        setLive(Boolean(data.live));
        setLastUpdated(data.generatedAt ?? Date.now());
      } catch (err) {
        console.error("Failed to poll GTFS-RT feed:", err);
      }
    }
    poll();
    const id = setInterval(poll, VEHICLE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/translink/rtds", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setCorridors(data.corridors ?? []);
        setBottlenecks(data.bottlenecks ?? []);
        setRtdsLive(Boolean(data.live));
      } catch (err) {
        console.error("Failed to poll RTDS feed:", err);
      }
    }
    poll();
    const id = setInterval(poll, CORRIDOR_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/translink/tspr")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setTsprStats(data.stats ?? []);
          setTsprLive(Boolean(data.live));
        }
      })
      .catch((err) => console.error("Failed to load TSPR stats:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/ai/summarize-alerts", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setSummarizedAlerts(data.alerts ?? []);
      } catch (err) {
        console.error("Failed to summarize alerts:", err);
      }
    }
    poll();
    const id = setInterval(poll, ALERT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // --- Derived analytics -------------------------------------------------
  const delayPredictions = useMemo(() => predictDelays(vehicles, corridors), [vehicles, corridors]);
  const computedBottlenecks = useMemo(
    () => (bottlenecks.length > 0 ? bottlenecks : detectBottlenecks(corridors)),
    [bottlenecks, corridors]
  );
  const stats = useMemo(
    () => computeSystemStats(vehicles, corridors, alerts),
    [vehicles, corridors, alerts]
  );

  const selectedVehicleCorridor = useMemo(() => {
    if (!selectedVehicle) return undefined;
    const prediction = delayPredictions.find((d) => d.vehicleId === selectedVehicle.id);
    return corridors.find((c) => prediction?.affectedCorridorIds.includes(c.corridorId));
  }, [selectedVehicle, corridors, delayPredictions]);

  const selectedVehiclePrediction = useMemo(
    () => delayPredictions.find((d) => d.vehicleId === selectedVehicle?.id),
    [selectedVehicle, delayPredictions]
  );

  const selectedHubStat = useMemo(
    () => tsprStats.find((s) => s.stopId === selectedHub?.id),
    [selectedHub, tsprStats]
  );

  const followedVehicle = useMemo(
    () => vehicles.find((v) => v.id === followVehicleId) ?? null,
    [vehicles, followVehicleId]
  );
  const followedVehiclePrediction = useMemo(
    () => delayPredictions.find((d) => d.vehicleId === followVehicleId),
    [delayPredictions, followVehicleId]
  );

  const gisLayerCounts = useMemo(() => {
    const counts = {} as Record<GisLayerId, number>;
    for (const id of ALL_GIS_LAYERS) {
      const dataset = gisDatasets.find((d) => d.id === id);
      counts[id] = dataset?.rows.length ?? 0;
    }
    return counts;
  }, [gisDatasets]);

  // --- Handlers -----------------------------------------------------------
  const toggleMode = useCallback((mode: TransitMode) => {
    setVisibleModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  }, []);

  const handleSelectVehicle = useCallback((vehicle: VehiclePosition) => {
    setSelectedHub(null);
    setSelectedVehicle(vehicle);
  }, []);

  const handleSelectHub = useCallback((hub: TransitHub) => {
    setSelectedVehicle(null);
    setSelectedHub(hub);
  }, []);

  const closeNodeDrawer = useCallback(() => {
    setSelectedVehicle(null);
    setSelectedHub(null);
  }, []);

  const handleTrackVehicle = useCallback((vehicle: VehiclePosition) => {
    setFollowVehicleId(vehicle.id);
    setSelectedVehicle(null);
    setTableOpen(false);
  }, []);

  const handleStopTracking = useCallback(() => {
    setFollowVehicleId(null);
  }, []);

  const handleToggleGisLayer = useCallback((id: GisLayerId) => {
    setGisLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleLocate = useCallback((lat: number, lon: number) => {
    setUserLocation({ lat, lon });
    mapRef.current?.flyTo(lon, lat, 15);
  }, []);

  const handleZoomTo = useCallback((positions: [number, number][]) => {
    mapRef.current?.fitBounds(positions);
  }, []);

  const handlePanTo = useCallback((position: [number, number]) => {
    mapRef.current?.flyTo(position[0], position[1]);
  }, []);

  const bannerAlerts = summarizedAlerts.length > 0 ? summarizedAlerts : alerts;

  return (
    <main className="relative h-full w-full bg-background">
      <TransitMap3D
        apiRef={mapRef}
        vehicles={vehicles}
        corridors={corridors}
        bottlenecks={computedBottlenecks}
        visibleModes={visibleModes}
        showCrowdDensity={showCrowdDensity}
        showCorridorFusion={showCorridorFusion}
        pitch={pitch}
        bearing={bearing}
        onViewChange={({ pitch: p, bearing: b }) => {
          setPitch(p);
          setBearing(b);
        }}
        onSelectVehicle={handleSelectVehicle}
        onSelectHub={handleSelectHub}
        gisLayerVisibility={gisLayerVisibility}
        userLocation={userLocation}
        followVehicleId={followVehicleId}
        cameraMode={cameraMode}
        showPrecipitation={showPrecipitation}
        showEvents={showEvents}
        showLiveCameras={showLiveCameras}
        alerts={alerts}
        onSelectCamera={setSelectedCamera}
      />

      <Header live={live} lastUpdated={lastUpdated} />
      <DisruptionBanner alerts={bannerAlerts} />
      <ControlPanel
        stats={stats}
        visibleModes={visibleModes}
        onToggleMode={toggleMode}
        showCrowdDensity={showCrowdDensity}
        onToggleCrowdDensity={() => setShowCrowdDensity((v) => !v)}
        showCorridorFusion={showCorridorFusion}
        onToggleCorridorFusion={() => setShowCorridorFusion((v) => !v)}
        pitch={pitch}
        bearing={bearing}
        onPitchChange={setPitch}
        onBearingChange={setBearing}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
      />

      <GisToolbar
        onOpenLayers={() => setLayersOpen(true)}
        onOpenLegend={() => setLegendOpen(true)}
        onOpenTable={() => setTableOpen((v) => !v)}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenOverlays={() => setOverlaysOpen(true)}
        onLocate={handleLocate}
      />

      <AnalyticsDrawer
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        bottlenecks={computedBottlenecks}
        tsprStats={tsprStats}
        delayPredictions={delayPredictions}
      />

      <NodeDrawer
        vehicle={selectedVehicle}
        hub={selectedHub}
        corridor={selectedVehicleCorridor}
        prediction={selectedVehiclePrediction}
        hubStat={selectedHubStat}
        onClose={closeNodeDrawer}
        onTrackVehicle={handleTrackVehicle}
      />

      <LayersModal
        open={layersOpen}
        onOpenChange={setLayersOpen}
        visibility={gisLayerVisibility}
        onToggle={handleToggleGisLayer}
        counts={gisLayerCounts}
      />
      <LegendModal open={legendOpen} onOpenChange={setLegendOpen} />
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
      <OverlayLayersMenu
        open={overlaysOpen}
        onOpenChange={setOverlaysOpen}
        showPrecipitation={showPrecipitation}
        onTogglePrecipitation={() => setShowPrecipitation((v) => !v)}
        showEvents={showEvents}
        onToggleEvents={() => setShowEvents((v) => !v)}
        showLiveCameras={showLiveCameras}
        onToggleLiveCameras={() => setShowLiveCameras((v) => !v)}
        feedStatus={[
          { label: "GTFS-RT Vehicles", live },
          { label: "RTDS Corridors", live: rtdsLive },
          { label: "TSPR Ridership", live: tsprLive },
        ]}
      />
      <LiveCameraModal camera={selectedCamera} onClose={() => setSelectedCamera(null)} />

      {!followVehicleId && (
        <DataTablePanel
          open={tableOpen}
          onClose={() => setTableOpen(false)}
          onZoomTo={handleZoomTo}
          onPanTo={handlePanTo}
        />
      )}

      {followedVehicle && (
        <>
          <CameraTrackingPanel
            vehicleName={followedVehicle.routeName}
            mode={cameraMode}
            onModeChange={setCameraMode}
            onStop={handleStopTracking}
          />
          <VehicleInspectorPanel
            vehicle={followedVehicle}
            prediction={followedVehiclePrediction}
            onClose={handleStopTracking}
          />
        </>
      )}

      {vehicles.length === 0 && <MapLoadingOverlay />}
    </main>
  );
}

function MapLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Booting TransLink GIS…</p>
    </div>
  );
}
