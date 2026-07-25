"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Bird, Crosshair, Plane, Rows3, Send, TrainFront, X } from "lucide-react";
import { CAMERA_MODE_LABELS, CAMERA_MODE_ORDER, CameraTrackingMode } from "@/lib/cameraTracking";
import { cn } from "@/lib/utils";

interface CameraTrackingPanelProps {
  vehicleName: string;
  mode: CameraTrackingMode;
  onModeChange: (mode: CameraTrackingMode) => void;
  onStop: () => void;
}

const MODE_ICONS: Record<CameraTrackingMode, typeof Crosshair> = {
  position: Crosshair,
  back: Rows3,
  topBack: ArrowUp,
  front: TrainFront,
  topFront: ArrowDown,
  helicopter: Plane,
  drone: Send,
  bird: Bird,
};

export default function CameraTrackingPanel({
  vehicleName,
  mode,
  onModeChange,
  onStop,
}: CameraTrackingPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto absolute right-4 top-[26rem] z-20 w-56 space-y-2 rounded-xl glass-panel p-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tracking</p>
          <p className="truncate text-sm text-foreground">{vehicleName}</p>
        </div>
        <button
          onClick={onStop}
          aria-label="Stop tracking"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-transit-high"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {CAMERA_MODE_ORDER.map((m) => {
          const Icon = MODE_ICONS[m];
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              title={CAMERA_MODE_LABELS[m]}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border px-1.5 py-2 text-center transition-colors",
                mode === m
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[9px] leading-none">{CAMERA_MODE_LABELS[m]}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
