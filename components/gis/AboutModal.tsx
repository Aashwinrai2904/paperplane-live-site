"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { isLiveDataConfigured } from "@/lib/translink";

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>About TransLink GIS</SheetTitle>
          <SheetDescription>Independent, unofficial project</SheetDescription>
        </SheetHeader>
        <div className="max-h-[55vh] space-y-4 overflow-y-auto px-6 pb-6 text-sm text-foreground scrollbar-thin">
          <p>
            TransLink GIS is an independent demo inspired by TransLink&rsquo;s public System Map
            application and by Mini Tokyo 3D&rsquo;s live rail visualization. It is{" "}
            <strong>not an official TransLink product</strong>.
          </p>

          <div>
            <p className="mb-1 font-semibold">Data</p>
            <p className="text-muted-foreground">
              This build is currently running on{" "}
              <strong className={isLiveDataConfigured ? "text-transit-low" : "text-transit-moderate"}>
                {isLiveDataConfigured ? "live TransLink data" : "simulated data"}
              </strong>
              . Vehicle positions, corridor speeds, and ridership baselines are deterministic mock
              generators unless <code className="rounded bg-secondary px-1 py-0.5 text-xs">TRANSLINK_API_KEY</code>{" "}
              is configured, in which case live GTFS-Realtime data is used instead.
            </p>
          </div>

          <div>
            <p className="mb-1 font-semibold">GTFS reference</p>
            <p className="text-muted-foreground">
              Route, stop, and schedule structure follows TransLink&rsquo;s General Transit Feed
              Specification (GTFS).{" "}
              <a
                href="https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources/gtfs/gtfs-data"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                translink.ca — GTFS data
              </a>
            </p>
          </div>

          <div>
            <p className="mb-1 font-semibold">Environmental overlays</p>
            <p className="text-muted-foreground">
              Precipitation radar is sourced live from the free{" "}
              <a href="https://www.rainviewer.com/api.html" target="_blank" rel="noreferrer" className="text-primary underline">
                RainViewer
              </a>{" "}
              public API — no key required. Live traffic cameras are opt-in: configure a camera
              provider URL to enable that layer, otherwise it shows a clearly labeled placeholder.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
