"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SKYTRAIN_LINES } from "@/lib/metroVancouverData";
import { MODE_COLOR_HEX, CROWD_COLOR_HEX } from "@/lib/colors";

interface LegendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LegendModal({ open, onOpenChange }: LegendModalProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Legend</SheetTitle>
          <SheetDescription>Map colors and symbols.</SheetDescription>
        </SheetHeader>
        <div className="max-h-[55vh] space-y-5 overflow-y-auto px-6 pb-6 scrollbar-thin">
          <LegendGroup title="Station & Exchange Locations">
            <LegendPoint color="#0F172A" ring label="Station" />
            <LegendPoint color="#64748B" ring label="Exchange / Hub" />
          </LegendGroup>

          <LegendGroup title="Lines">
            {SKYTRAIN_LINES.map((l) => (
              <LegendLine key={l.routeId} color={l.color} label={`SkyTrain (${l.name})`} />
            ))}
            <LegendLine color={MODE_COLOR_HEX.seabus} label="SeaBus" />
            <LegendLine color={MODE_COLOR_HEX.bus} label="Bus / RapidBus" />
          </LegendGroup>

          <LegendGroup title="Crowd Density">
            <LegendPoint color={CROWD_COLOR_HEX.low} label="Low occupancy" />
            <LegendPoint color={CROWD_COLOR_HEX.moderate} label="Moderate occupancy" />
            <LegendPoint color={CROWD_COLOR_HEX.high} label="High occupancy" />
          </LegendGroup>

          <LegendGroup title="Corridor Speed">
            <LegendLine color={CROWD_COLOR_HEX.low} label="Free-flowing (> 55% of free-flow speed)" />
            <LegendLine color={CROWD_COLOR_HEX.moderate} label="Moderate bottleneck (30–55%)" />
            <LegendLine color={CROWD_COLOR_HEX.high} label="Severe bottleneck (< 30%)" />
          </LegendGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LegendGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-foreground">
      <span className="h-1 w-7 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

function LegendPoint({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm text-foreground">
      <span
        className="h-3 w-3 rounded-full"
        style={ring ? { border: `2px solid ${color}`, backgroundColor: "transparent" } : { backgroundColor: color }}
      />
      {label}
    </div>
  );
}
