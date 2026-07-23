"use client";

import { Radio, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  live: boolean;
  lastUpdated: number | null;
}

export default function Header({ live, lastUpdated }: HeaderProps) {
  return (
    <header className="pointer-events-auto absolute left-4 top-4 z-20 flex items-center gap-3 rounded-xl glass-panel px-4 py-2.5">
      <Satellite className="h-5 w-5 text-primary" />
      <div className="leading-tight">
        <h1 className="text-sm font-semibold tracking-wide text-foreground">
          TransLink GIS
        </h1>
        <p className="text-[11px] text-muted-foreground">Metro Vancouver · Live Transit Network</p>
      </div>
      <div className="ml-2 flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1">
        <Radio
          className={cn(
            "h-3 w-3",
            live ? "text-transit-low animate-pulse-glow" : "text-transit-moderate"
          )}
        />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {live ? "Live Feed" : "Simulated"}
        </span>
      </div>
      {lastUpdated && (
        <span className="hidden text-[10px] text-muted-foreground sm:inline">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </header>
  );
}
