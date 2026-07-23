"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertOctagon, TrendingDown, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BottleneckSegment, DelayPrediction, TsprStopStat } from "@/lib/types";

interface AnalyticsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bottlenecks: BottleneckSegment[];
  tsprStats: TsprStopStat[];
  delayPredictions: DelayPrediction[];
}

export default function AnalyticsDrawer({
  open,
  onOpenChange,
  bottlenecks,
  tsprStats,
  delayPredictions,
}: AnalyticsDrawerProps) {
  const topDelays = [...delayPredictions]
    .sort((a, b) => b.predictedDelayMinutes - a.predictedDelayMinutes)
    .slice(0, 8);

  const ridershipData = tsprStats
    .map((s) => ({ name: shortenName(s.stopName), boardings: s.avgBoardings }))
    .sort((a, b) => b.boardings - a.boardings);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto scrollbar-thin">
        <SheetHeader>
          <SheetTitle>Analytics &amp; Diagnostics</SheetTitle>
          <SheetDescription>
            Corridor bottlenecks, ridership baselines, and predicted cascading delays.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="bottlenecks" className="flex-1 px-6 pb-6">
          <TabsList className="w-full">
            <TabsTrigger value="bottlenecks" className="flex-1">
              Bottlenecks
            </TabsTrigger>
            <TabsTrigger value="ridership" className="flex-1">
              Ridership
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex-1">
              Delays
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bottlenecks" className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertOctagon className="h-3.5 w-3.5" />
              Corridors running below 55% of free-flow speed
            </p>
            {bottlenecks.length === 0 && (
              <p className="text-sm text-muted-foreground">No active bottlenecks detected.</p>
            )}
            <div className="space-y-2">
              {bottlenecks.map((b) => (
                <div
                  key={b.corridorId}
                  className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.currentSpeedKmh} km/h of {b.freeFlowSpeedKmh} km/h free-flow
                    </p>
                  </div>
                  <Badge variant={b.severity === "severe" ? "danger" : "warning"}>
                    {Math.round(b.congestionRatio * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ridership" className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Avg. daily boardings by hub (TSPR baseline)
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ridershipData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(215 20% 65%)" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="hsl(215 20% 65%)"
                    fontSize={11}
                    width={90}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(222 47% 8%)",
                      border: "1px solid hsl(217 33% 22%)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="boardings" fill="#4FC3F7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5" />
              Predicted delays, 15-30 min ahead of official updates
            </p>
            {topDelays.map((d) => (
              <div
                key={d.vehicleId}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{d.routeName}</p>
                  <p className="text-xs text-muted-foreground">
                    Confidence {Math.round(d.confidence * 100)}% · {d.horizonMinutes}min horizon
                  </p>
                </div>
                <Badge
                  variant={
                    d.predictedDelayMinutes > 12
                      ? "danger"
                      : d.predictedDelayMinutes > 5
                      ? "warning"
                      : "success"
                  }
                >
                  +{d.predictedDelayMinutes.toFixed(1)}m
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function shortenName(name: string): string {
  return name.replace(" Station", "").replace("Town Centre", "TC");
}
