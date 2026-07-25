"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Crosshair,
  Download,
  Filter,
  Sigma,
  X,
} from "lucide-react";
import SimpleMenu, { MenuItem } from "./SimpleMenu";
import FilterModal from "./FilterModal";
import StatisticsModal from "./StatisticsModal";
import { buildGisDatasets } from "@/lib/gisData";
import { applyFilters, FilterClause } from "@/lib/gisFilter";
import { exportDataset, ExportFormat } from "@/lib/gisExport";
import { cn } from "@/lib/utils";

interface DataTablePanelProps {
  open: boolean;
  onClose: () => void;
  onZoomTo: (positions: [number, number][]) => void;
  onPanTo: (position: [number, number]) => void;
}

type SortDir = "asc" | "desc" | null;

const EMPTY_CLAUSES: FilterClause[] = [];

export default function DataTablePanel({ open, onClose, onZoomTo, onPanTo }: DataTablePanelProps) {
  const datasets = useMemo(() => buildGisDatasets(), []);
  const [activeId, setActiveId] = useState(datasets[0].id);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [filtersByDataset, setFiltersByDataset] = useState<Record<string, FilterClause[]>>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const active = datasets.find((d) => d.id === activeId) ?? datasets[0];
  const clauses = filtersByDataset[activeId] ?? EMPTY_CLAUSES;

  const filteredRows = useMemo(() => applyFilters(active.rows, clauses), [active.rows, clauses]);

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDir) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const visibleColumns = active.columns.filter((c) => !hiddenColumns.has(c.key));

  const switchDataset = (id: string) => {
    setActiveId(id);
    setSortKey(null);
    setSortDir(null);
    setHiddenColumns(new Set());
    setSelectedIds(new Set());
  };

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const toggleRow = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRows = sortedRows.filter((r) => selectedIds.has(r.objectId));
  const zoomTargetRows = selectedRows.length > 0 ? selectedRows : sortedRows;

  const handleExport = (format: ExportFormat) => {
    exportDataset(format, active.label, filteredRows, active.columns, active.getPosition, active.nameKey);
  };

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          key="data-table-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-[38vh] min-h-[280px] flex-col rounded-t-2xl glass-panel"
        >
          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            <select
              value={activeId}
              onChange={(e) => switchDataset(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            <SimpleMenu
              trigger={
                <button className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground" aria-label="Table actions">
                  <Filter className="h-3.5 w-3.5" />
                </button>
              }
            >
              {(close) => (
                <>
                  <MenuItem icon={Filter} onClick={() => { setFilterOpen(true); close(); }}>
                    Set filter
                  </MenuItem>
                  <MenuItem icon={Sigma} onClick={() => { setStatsOpen(true); close(); }}>
                    Calculate statistics
                  </MenuItem>
                  <MenuItem
                    icon={Crosshair}
                    onClick={() => {
                      onZoomTo(zoomTargetRows.map((r) => active.getPosition(r)));
                      close();
                    }}
                  >
                    Zoom to
                  </MenuItem>
                  <MenuItem
                    icon={Crosshair}
                    onClick={() => {
                      const target = zoomTargetRows[0];
                      if (target) onPanTo(active.getPosition(target));
                      close();
                    }}
                  >
                    Pan to
                  </MenuItem>
                  <div className="my-1 border-t border-border/50" />
                  {(["json", "csv", "geojson", "kml"] as ExportFormat[]).map((fmt) => (
                    <MenuItem key={fmt} icon={Download} onClick={() => { handleExport(fmt); close(); }}>
                      Export to {fmt.toUpperCase()}
                    </MenuItem>
                  ))}
                  <MenuItem icon={Download} disabled>
                    Export to Shapefile (desktop GIS only)
                  </MenuItem>
                  <MenuItem icon={Download} disabled>
                    Export to FGDB (desktop GIS only)
                  </MenuItem>
                </>
              )}
            </SimpleMenu>

            <SimpleMenu
              trigger={
                <button className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground" aria-label="Show or hide columns">
                  <Columns3 className="h-3.5 w-3.5" />
                </button>
              }
            >
              {() => (
                <>
                  {active.columns.map((c) => (
                    <label
                      key={c.key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/60"
                    >
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.has(c.key)}
                        onChange={() =>
                          setHiddenColumns((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.key)) next.delete(c.key);
                            else next.add(c.key);
                            return next;
                          })
                        }
                      />
                      {c.label}
                    </label>
                  ))}
                </>
              )}
            </SimpleMenu>

            <button
              onClick={onClose}
              className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close table"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full min-w-[500px] border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-card/95 backdrop-blur">
                <tr>
                  {visibleColumns.map((c) => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className="cursor-pointer select-none whitespace-nowrap border-b border-border/50 px-3 py-2 font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {sortKey === c.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.objectId}
                    onClick={() => toggleRow(row.objectId)}
                    className={cn(
                      "cursor-pointer border-b border-border/30 transition-colors hover:bg-secondary/40",
                      selectedIds.has(row.objectId) && "bg-primary/15"
                    )}
                  >
                    {visibleColumns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-3 py-1.5 text-foreground">
                        {row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground">
            Total: {filteredRows.length} | Selection: {selectedIds.size}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      {open && (
        <FilterModal
          open={filterOpen}
          onOpenChange={setFilterOpen}
          datasetLabel={active.label}
          columns={active.columns}
          clauses={clauses}
          onChange={(next) => setFiltersByDataset((prev) => ({ ...prev, [activeId]: next }))}
        />
      )}
      {open && (
        <StatisticsModal
          open={statsOpen}
          onOpenChange={setStatsOpen}
          datasetLabel={active.label}
          columns={active.columns}
          rows={filteredRows}
        />
      )}
    </>
  );
}
