"use client";

import { Bike, Building2, MapPin, Route, TrainFront, Waypoints, Anchor } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { GisLayerId } from "@/lib/gisData";

interface LayerConfig {
  id: GisLayerId;
  label: string;
  icon: typeof MapPin;
  count: number;
}

interface LayersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibility: Record<GisLayerId, boolean>;
  onToggle: (id: GisLayerId) => void;
  counts: Record<GisLayerId, number>;
}

const LAYER_ORDER: { id: GisLayerId; label: string; icon: typeof MapPin }[] = [
  { id: "stations", label: "Stations", icon: TrainFront },
  { id: "busExchanges", label: "Bus Exchanges", icon: Building2 },
  { id: "stops", label: "Stops", icon: MapPin },
  { id: "bikeParkades", label: "Bike Parkades", icon: Bike },
  { id: "linesRapidTransit", label: "Lines - Rapid Transit Only", icon: Waypoints },
  { id: "lines", label: "Lines", icon: Route },
  { id: "otherTransportation", label: "Other Transportation", icon: Anchor },
];

export default function LayersModal({ open, onOpenChange, visibility, onToggle, counts }: LayersModalProps) {
  const layers: LayerConfig[] = LAYER_ORDER.map((l) => ({ ...l, count: counts[l.id] ?? 0 }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Layers</SheetTitle>
          <SheetDescription>Show or hide layers on the map.</SheetDescription>
        </SheetHeader>
        <div className="max-h-[55vh] space-y-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
          {layers.map(({ id, label, icon: Icon, count }) => (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{count} features</p>
                </div>
              </div>
              <Switch checked={visibility[id]} onCheckedChange={() => onToggle(id)} />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
