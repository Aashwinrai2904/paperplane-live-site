"use client";

import { Camera, CloudRain, Radio, TriangleAlert } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface FeedStatus {
  label: string;
  live: boolean;
}

interface OverlayLayersMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showPrecipitation: boolean;
  onTogglePrecipitation: () => void;
  showEvents: boolean;
  onToggleEvents: () => void;
  showLiveCameras: boolean;
  onToggleLiveCameras: () => void;
  feedStatus: FeedStatus[];
}

export default function OverlayLayersMenu({
  open,
  onOpenChange,
  showPrecipitation,
  onTogglePrecipitation,
  showEvents,
  onToggleEvents,
  showLiveCameras,
  onToggleLiveCameras,
  feedStatus,
}: OverlayLayersMenuProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Environmental Overlays</SheetTitle>
          <SheetDescription>Live-data layers, inspired by Mini Tokyo 3D.</SheetDescription>
        </SheetHeader>
        <div className="space-y-2 px-6 pb-4">
          <OverlayRow
            icon={CloudRain}
            label="Precipitation radar"
            sub="Live from RainViewer"
            checked={showPrecipitation}
            onCheckedChange={onTogglePrecipitation}
          />
          <OverlayRow
            icon={TriangleAlert}
            label="Events"
            sub="Active service alerts"
            checked={showEvents}
            onCheckedChange={onToggleEvents}
          />
          <OverlayRow
            icon={Camera}
            label="Live cameras"
            sub="Traffic camera markers"
            checked={showLiveCameras}
            onCheckedChange={onToggleLiveCameras}
          />
        </div>

        <div className="space-y-2 border-t border-border/50 px-6 py-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Radio className="h-3.5 w-3.5" />
            Feed status
          </p>
          {feedStatus.map((f) => (
            <div key={f.label} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{f.label}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-1.5 w-1.5 rounded-full", f.live ? "bg-transit-low" : "bg-transit-moderate")} />
                {f.live ? "Live" : "Simulated"}
              </span>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OverlayRow({
  icon: Icon,
  label,
  sub,
  checked,
  onCheckedChange,
}: {
  icon: typeof CloudRain;
  label: string;
  sub: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
