"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GisColumn } from "@/lib/gisData";
import { FilterClause, FilterOperator, OPERATOR_LABELS } from "@/lib/gisFilter";

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetLabel: string;
  columns: GisColumn[];
  clauses: FilterClause[];
  onChange: (clauses: FilterClause[]) => void;
}

const OPERATORS = Object.keys(OPERATOR_LABELS) as FilterOperator[];

export default function FilterModal({
  open,
  onOpenChange,
  datasetLabel,
  columns,
  clauses,
  onChange,
}: FilterModalProps) {
  const addClause = () => {
    onChange([
      ...clauses,
      { id: crypto.randomUUID(), field: columns[0]?.key ?? "", operator: "contains", value: "" },
    ]);
  };

  const updateClause = (id: string, patch: Partial<FilterClause>) => {
    onChange(clauses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeClause = (id: string) => {
    onChange(clauses.filter((c) => c.id !== id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Set Filter</SheetTitle>
          <SheetDescription>{datasetLabel}</SheetDescription>
        </SheetHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto px-6 pb-4 scrollbar-thin">
          {clauses.length === 0 && (
            <p className="text-sm text-muted-foreground">No clause. Please add one.</p>
          )}
          {clauses.map((clause) => (
            <div
              key={clause.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 p-2"
            >
              <select
                value={clause.field}
                onChange={(e) => updateClause(clause.id, { field: e.target.value })}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={clause.operator}
                onChange={(e) => updateClause(clause.id, { operator: e.target.value as FilterOperator })}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>
              <input
                value={clause.value}
                onChange={(e) => updateClause(clause.id, { value: e.target.value })}
                placeholder="value"
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              />
              <button
                onClick={() => removeClause(clause.id)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-transit-high"
                aria-label="Remove clause"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 pb-6">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={addClause}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
          {clauses.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              Clear all
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
