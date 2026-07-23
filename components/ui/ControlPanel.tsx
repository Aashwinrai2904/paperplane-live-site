"use client";

import { motion } from "framer-motion";
import { Bus, TrainFront, Ship, Layers, Waves, Gauge, BarChart3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import EfficiencyGauge from "@/components/ui/EfficiencyGauge";
import { TransitMode, SystemStats } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  stats: SystemStats;
  visibleModes: Set<TransitMode>;
  onToggleMode: (mode: TransitMode) => void;
  showCrowdDensity: boolean;
  onToggleCrowdDensity: () => void;
  showCorridorFusion: boolean;
  onToggleCorridorFusion: () => void;
  pitch: number;
  bearing: number;
  onPitchChange: (pitch: number) => void;
  onBearingChange: (bearing: number) => void;
  onOpenAnalytics: () => void;
}

const MODE_CONFIG: { mode: TransitMode; label: string; icon: typeof Bus }[] = [
  { mode: "bus", label: "Bus", icon: Bus },
  { mode: "skytrain", label: "SkyTrain", icon: TrainFront },
  { mode: "seabus", label: "SeaBus", icon: Ship },
];

export default function ControlPanel({
  stats,
  visibleModes,
  onToggleMode,
  showCrowdDensity,
  onToggleCrowdDensity,
  showCorridorFusion,
  onToggleCorridorFusion,
  pitch,
  bearing,
  onPitchChange,
  onBearingChange,
  onOpenAnalytics,
}: ControlPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="pointer-events-auto absolute bottom-4 left-4 z-20 w-[300px] space-y-3 rounded-xl glass-panel p-4 scrollbar-thin"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          System Overview
        </div>
        <EfficiencyGauge value={stats.systemEfficiency} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MODE_CONFIG.map(({ mode, label, icon: Icon }) => {
          const count =
            mode === "bus"
              ? stats.activeBuses
              : mode === "skytrain"
              ? stats.activeSkyTrains
              : stats.activeSeaBuses;
          const active = visibleModes.has(mode);
          return (
            <button
              key={mode}
              onClick={() => onToggleMode(mode)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/50 bg-transparent text-muted-foreground opacity-50"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-base font-bold leading-none">{count}</span>
              <span className="text-[10px] leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-border/50 pt-3">
        <ToggleRow
          icon={Waves}
          label="Crowd density"
          checked={showCrowdDensity}
          onCheckedChange={onToggleCrowdDensity}
        />
        <ToggleRow
          icon={Layers}
          label="Corridor fusion"
          checked={showCorridorFusion}
          onCheckedChange={onToggleCorridorFusion}
        />
      </div>

      <div className="space-y-3 border-t border-border/50 pt-3">
        <SliderRow label="Tilt" value={pitch} min={0} max={75} onChange={onPitchChange} />
        <SliderRow label="Rotate" value={bearing} min={-180} max={180} onChange={onBearingChange} />
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="w-full gap-2"
        onClick={onOpenAnalytics}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Analytics &amp; Bottlenecks
      </Button>
    </motion.div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: typeof Waves;
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(value)}°</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
