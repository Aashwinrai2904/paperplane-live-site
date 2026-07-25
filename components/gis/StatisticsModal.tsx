"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { GisColumn } from "@/lib/gisData";
import { calculateStatistics } from "@/lib/gisFilter";

interface StatisticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetLabel: string;
  columns: GisColumn[];
  rows: Record<string, string | number>[];
}

export default function StatisticsModal({
  open,
  onOpenChange,
  datasetLabel,
  columns,
  rows,
}: StatisticsModalProps) {
  const numericColumns = columns.filter((c) => c.numeric);
  const [field, setField] = useState(numericColumns[0]?.key ?? "");

  const stats = useMemo(
    () => (field ? calculateStatistics(rows, field) : null),
    [rows, field]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Calculate Statistics</SheetTitle>
          <SheetDescription>{datasetLabel}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-6 pb-6">
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Please select a field</option>
            {numericColumns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          {stats && (
            <div className="space-y-1.5 rounded-lg border border-border/50 bg-secondary/30 p-3">
              <StatRow label="Number of values" value={stats.count.toLocaleString()} />
              <StatRow label="Sum of values" value={formatNum(stats.sum)} />
              <StatRow label="Minimum" value={formatNum(stats.min)} />
              <StatRow label="Maximum" value={formatNum(stats.max)} />
              <StatRow label="Average" value={formatNum(stats.average)} />
              <StatRow label="Standard deviation" value={formatNum(stats.standardDeviation)} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
