"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { ServiceAlert } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DisruptionBannerProps {
  alerts: ServiceAlert[];
}

const SEVERITY_VARIANT: Record<ServiceAlert["severity"], "danger" | "warning" | "outline"> = {
  severe: "danger",
  warning: "warning",
  info: "outline",
};

export default function DisruptionBanner({ alerts }: DisruptionBannerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % alerts.length), 6500);
    return () => clearInterval(id);
  }, [alerts.length]);

  useEffect(() => {
    if (index >= alerts.length) setIndex(0);
  }, [alerts.length, index]);

  const current = alerts[index];

  return (
    <div className="pointer-events-auto absolute left-1/2 top-4 z-20 w-[min(560px,90vw)] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl glass-panel px-4 py-2.5">
        <div className="flex shrink-0 items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI Ticker
          </span>
        </div>

        <div className="h-8 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2 truncate"
              >
                <AlertTriangle
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    current.severity === "severe"
                      ? "text-transit-high"
                      : current.severity === "warning"
                      ? "text-transit-moderate"
                      : "text-muted-foreground"
                  )}
                />
                <span className="truncate text-xs text-foreground">
                  {current.aiSummary ?? current.header}
                </span>
                <Badge variant={SEVERITY_VARIANT[current.severity]} className="shrink-0">
                  {current.severity}
                </Badge>
              </motion.div>
            ) : (
              <motion.div
                key="clear"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-transit-low" />
                <span className="text-xs text-foreground">All systems normal — no active disruptions</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {alerts.length > 1 && (
          <div className="flex shrink-0 gap-1">
            {alerts.map((a, i) => (
              <span
                key={a.id}
                className={cn(
                  "h-1 w-3 rounded-full transition-colors",
                  i === index ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
