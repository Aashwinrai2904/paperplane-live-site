"use client";

import { useState } from "react";
import { LocateFixed, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeolocateControlProps {
  onLocate: (lat: number, lon: number) => void;
  className?: string;
}

type Status = "idle" | "locating" | "denied" | "error";

export default function GeolocateControl({ onLocate, className }: GeolocateControlProps) {
  const [status, setStatus] = useState<Status>("idle");

  const handleClick = () => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("idle");
        onLocate(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={handleClick}
        aria-label="Find my location"
        className="flex h-9 w-9 items-center justify-center rounded-md glass-panel text-foreground transition-colors hover:text-primary"
      >
        {status === "locating" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LocateFixed className="h-4 w-4" />
        )}
      </button>
      {(status === "denied" || status === "error") && (
        <div className="absolute right-full top-0 mr-2 w-48 rounded-md glass-panel px-2.5 py-1.5 text-[11px] text-muted-foreground">
          {status === "denied"
            ? "Location permission denied. Enable it in your browser settings to use Find My Location."
            : "Couldn't determine your location."}
        </div>
      )}
    </div>
  );
}
