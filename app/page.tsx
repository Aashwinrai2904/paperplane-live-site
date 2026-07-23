"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import Header from "@/components/ui/Header";
import ControlPanel from "@/components/ui/ControlPanel";
import DisruptionBanner from "@/components/ui/DisruptionBanner";
import AnalyticsDrawer from "@/components/ui/AnalyticsDrawer";
import NodeDrawer from "@/components/ui/NodeDrawer";

import { predictDelays, detectBottlenecks } from "@/lib/delayPredictor";
import { computeSystemStats } from "@/lib/translink";
import { MAP_DEFAULT_BEARING, MAP_DEFAULT_PITCH } from "@/lib/metroVancouverData";
import {
  BottleneckSegment,
  CorridorSpeedReading,
  ServiceAlert,
  TransitHub,
  TransitMode,
  TsprStopStat,
  VehiclePosition,
} from "@/lib/types";

const TransitMap3D = dynamic(() => import("@/components/map/TransitMap3D"), {
  ssr: false,
  loading: () => <MapLoadingOverlay />,
});

const VEHICLE_POLL_MS = 10_000;
const CORRIDOR_POLL_MS = 15_000;
const ALERT_POLL_MS = 30_000;
const ALL_MODES: TransitMode[] = ["bus", "skytrain", "seabus"];

export default function Home() {
  const [vehicles, setVehicles] = useState<VehiclePosition[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [summarizedAlerts, setSummarizedAlerts] = useState<ServiceAlert[]>([]);
  const [corridors, setCorridors] = useState<CorridorSpeedReading[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckSegment[]>([]);
  const [tsprStats, setTsprStats] = useState<TsprStopStat[]>([]);
  const [live, setLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [visibleModes, setVisibleModes] = useState<Set<TransitMode>>(new Set(ALL_MODES));
  const [showCrowdDensity, setShowCrowdDensity] = useState(true);
  const [showCorridorFusion, setShowCorridorFusion] = useState(true);
  const [pitch, setPitch] = useState(MAP_DEFAULT_PITCH);
  const [bearing, setBearing] = useState(MAP_DEFAULT_BEARING);

  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null);
  const [selectedHub, setSelectedHub] = useState<TransitHub | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

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
        if (!cancelled) setTsprStats(data.stats ?? []);
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

  const bannerAlerts = summarizedAlerts.length > 0 ? summarizedAlerts : alerts;

  return (
    <main className="relative h-full w-full bg-background">
      <TransitMap3D
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
      />

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
