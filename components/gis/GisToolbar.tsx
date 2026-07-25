"use client";

import { Info, Layers, LayoutGrid, ListTree, Table2 } from "lucide-react";
import GeolocateControl from "./GeolocateControl";

interface GisToolbarProps {
  onOpenLayers: () => void;
  onOpenLegend: () => void;
  onOpenTable: () => void;
  onOpenAbout: () => void;
  onOpenOverlays: () => void;
  onLocate: (lat: number, lon: number) => void;
}

export default function GisToolbar({
  onOpenLayers,
  onOpenLegend,
  onOpenTable,
  onOpenAbout,
  onOpenOverlays,
  onLocate,
}: GisToolbarProps) {
  return (
    <div className="pointer-events-auto absolute right-4 top-24 z-20 flex flex-col gap-1.5">
      <ToolbarButton icon={Layers} label="Layers" onClick={onOpenLayers} />
      <ToolbarButton icon={ListTree} label="Legend" onClick={onOpenLegend} />
      <ToolbarButton icon={Table2} label="Data table" onClick={onOpenTable} />
      <ToolbarButton icon={LayoutGrid} label="Environmental overlays" onClick={onOpenOverlays} />
      <ToolbarButton icon={Info} label="About" onClick={onOpenAbout} />
      <GeolocateControl onLocate={onLocate} />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Layers;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md glass-panel text-foreground transition-colors hover:text-primary"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
