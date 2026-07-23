"use client";

import type { ReactNode } from "react";
import { Bus, TrainFront, Ship, MapPin, Gauge, Clock, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  CorridorSpeedReading,
  DelayPrediction,
  TransitHub,
  TransitMode,
  TsprStopStat,
  VehiclePosition,
} from "@/lib/types";

interface NodeDrawerProps {
  vehicle: VehiclePosition | null;
  hub: TransitHub | null;
  corridor?: CorridorSpeedReading;
  prediction?: DelayPrediction;
  hubStat?: TsprStopStat;
  onClose: () => void;
}

const MODE_ICON: Record<TransitMode, typeof Bus> = {
  bus: Bus,
  skytrain: TrainFront,
  seabus: Ship,
};

const CROWD_VARIANT = { low: "success", moderate: "warning", high: "danger" } as const;

export default function NodeDrawer({
  vehicle,
  hub,
  corridor,
  prediction,
  hubStat,
  onClose,
}: NodeDrawerProps) {
  const open = Boolean(vehicle || hub);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        {vehicle && <VehicleDetails vehicle={vehicle} corridor={corridor} prediction={prediction} />}
        {hub && <HubDetails hub={hub} stat={hubStat} />}
      </SheetContent>
    </Sheet>
  );
}

function VehicleDetails({
  vehicle,
  corridor,
  prediction,
}: {
  vehicle: VehiclePosition;
  corridor?: CorridorSpeedReading;
  prediction?: DelayPrediction;
}) {
  const Icon = MODE_ICON[vehicle.mode];
  const scheduledOffsetMin = vehicle.scheduledArrivalOffsetSec / 60;
  const predictedMin = prediction?.predictedDelayMinutes ?? Math.max(0, scheduledOffsetMin);

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <SheetTitle>{vehicle.routeName}</SheetTitle>
        </div>
        <SheetDescription>Vehicle {vehicle.id} · {vehicle.mode}</SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-6 pb-6">
        <Section icon={Clock} title="Arrival estimate">
          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="Scheduled offset"
              value={`${scheduledOffsetMin >= 0 ? "+" : ""}${scheduledOffsetMin.toFixed(1)}m`}
            />
            <Metric
              label="Predicted delay"
              value={`+${predictedMin.toFixed(1)}m`}
              variant={predictedMin > 10 ? "danger" : predictedMin > 4 ? "warning" : "success"}
            />
          </div>
          {prediction && (
            <p className="text-xs text-muted-foreground">
              Cascading-delay confidence: {Math.round(prediction.confidence * 100)}% over a{" "}
              {prediction.horizonMinutes}-minute horizon.
            </p>
          )}
        </Section>

        {corridor && (
          <Section icon={Gauge} title="Corridor speed comparison">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Current speed" value={`${corridor.currentSpeedKmh} km/h`} />
              <Metric label="Free-flow speed" value={`${corridor.freeFlowSpeedKmh} km/h`} />
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round(corridor.congestionRatio * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{corridor.name}</p>
          </Section>
        )}

        <Section icon={Users} title="Crowd density">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">
              {Math.round(vehicle.occupancyRatio * 100)}% estimated load
            </span>
            <Badge variant={CROWD_VARIANT[vehicle.crowdLevel]}>{vehicle.crowdLevel}</Badge>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-transit-moderate transition-all"
              style={{ width: `${Math.round(vehicle.occupancyRatio * 100)}%` }}
            />
          </div>
        </Section>
      </div>
    </>
  );
}

function HubDetails({ hub, stat }: { hub: TransitHub; stat?: TsprStopStat }) {
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <SheetTitle>{hub.name}</SheetTitle>
        </div>
        <SheetDescription>Multimodal transit hub</SheetDescription>
      </SheetHeader>

      <div className="space-y-4 px-6 pb-6">
        <Section icon={Gauge} title="Modes served">
          <div className="flex gap-2">
            {hub.modes.map((mode) => {
              const Icon = MODE_ICON[mode];
              return (
                <Badge key={mode} variant="outline" className="gap-1">
                  <Icon className="h-3 w-3" />
                  {mode}
                </Badge>
              );
            })}
          </div>
        </Section>

        {hub.transferVectors.length > 0 && (
          <Section icon={MapPin} title="Transfer connections">
            <ul className="space-y-1 text-sm text-foreground">
              {hub.transferVectors.map((tv) => (
                <li key={tv.toHubId} className="flex items-center justify-between">
                  <span>{tv.toHubId.replace(/-/g, " ")}</span>
                  <Badge variant="outline">{tv.mode}</Badge>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {stat && (
          <Section icon={Users} title="Ridership baseline (TSPR)">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Avg. boardings" value={stat.avgBoardings.toLocaleString()} />
              <Metric label="Peak load factor" value={`${Math.round(stat.peakLoadFactor * 100)}%`} />
            </div>
          </Section>
        )}
      </div>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          variant === "danger"
            ? "text-lg font-bold text-transit-high"
            : variant === "warning"
            ? "text-lg font-bold text-transit-moderate"
            : variant === "success"
            ? "text-lg font-bold text-transit-low"
            : "text-lg font-bold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
