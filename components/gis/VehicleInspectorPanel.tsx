"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bus, Check, Copy, Ship, TrainFront, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DelayPrediction, TransitMode, VehiclePosition } from "@/lib/types";
import { buildVehicleSchedule } from "@/lib/vehicleSchedule";
import { MODE_COLOR_HEX } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface VehicleInspectorPanelProps {
  vehicle: VehiclePosition;
  prediction?: DelayPrediction;
  onClose: () => void;
}

const MODE_ICON: Record<TransitMode, typeof Bus> = {
  bus: Bus,
  skytrain: TrainFront,
  seabus: Ship,
};

export default function VehicleInspectorPanel({ vehicle, prediction, onClose }: VehicleInspectorPanelProps) {
  const [copied, setCopied] = useState(false);
  const schedule = buildVehicleSchedule(vehicle);
  const previousStop = [...schedule].reverse().find((s) => s.status === "passed");
  const nextStop = schedule.find((s) => s.status === "next");
  const destination = schedule[schedule.length - 1];
  const Icon = MODE_ICON[vehicle.mode];
  const delayMinutes = prediction?.predictedDelayMinutes ?? Math.max(0, vehicle.scheduledArrivalOffsetSec / 60);

  const handleShare = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("vehicle", vehicle.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore, URL bar still shows the param once set.
    }
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 mx-auto max-h-[45vh] w-full max-w-lg overflow-hidden rounded-t-2xl glass-panel sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
    >
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${MODE_COLOR_HEX[vehicle.mode]}30` }}
        >
          <Icon className="h-4 w-4" style={{ color: MODE_COLOR_HEX[vehicle.mode] }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{vehicle.routeName}</p>
          <p className="truncate text-xs text-muted-foreground">
            #{vehicle.id} {destination && `— for ${destination.name}`}
          </p>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Share this vehicle"}
        </button>
        <button onClick={onClose} aria-label="Close inspector" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-3 text-xs">
        <InfoBlock label="Previous stop" value={previousStop?.name ?? "—"} sub={previousStop ? "Departed" : undefined} />
        <InfoBlock
          label="Next stop"
          value={nextStop?.name ?? "—"}
          sub={nextStop ? `${nextStop.etaMinutes} min` : undefined}
        />
      </div>

      <div className="flex items-center gap-2 px-4 pb-2">
        <Badge variant={delayMinutes > 5 ? "danger" : delayMinutes > 1 ? "warning" : "success"}>
          {delayMinutes < 0.5 ? "On time" : `${delayMinutes.toFixed(1)} minutes late`}
        </Badge>
        <span className="text-[11px] text-muted-foreground">{Math.round(vehicle.occupancyRatio * 100)}% occupancy</span>
      </div>

      <div className="max-h-[16vh] overflow-y-auto border-t border-border/50 px-4 py-2 scrollbar-thin">
        {schedule.map((stop) => (
          <div
            key={stop.name}
            className={cn(
              "flex items-center justify-between border-b border-border/20 py-1.5 text-xs last:border-b-0",
              stop.status === "passed" && "text-muted-foreground opacity-50",
              stop.status === "next" && "font-semibold text-primary",
              stop.status === "upcoming" && "text-foreground"
            )}
          >
            <span>{stop.name}</span>
            <span>{stop.status === "passed" ? "Departed" : `${stop.etaMinutes} min`}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function InfoBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
