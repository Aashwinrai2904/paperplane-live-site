export type FilterOperator = "equals" | "notEquals" | "contains" | "gt" | "lt";

export interface FilterClause {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: "is",
  notEquals: "is not",
  contains: "contains",
  gt: "is greater than",
  lt: "is less than",
};

export function applyFilters<T extends Record<string, string | number>>(
  rows: T[],
  clauses: FilterClause[]
): T[] {
  const active = clauses.filter((c) => c.value.trim() !== "");
  if (active.length === 0) return rows;

  return rows.filter((row) =>
    active.every((clause) => {
      const cell = row[clause.field];
      if (cell === undefined) return false;
      const cellStr = String(cell).toLowerCase();
      const valueStr = clause.value.toLowerCase();

      switch (clause.operator) {
        case "equals":
          return cellStr === valueStr;
        case "notEquals":
          return cellStr !== valueStr;
        case "contains":
          return cellStr.includes(valueStr);
        case "gt":
          return Number(cell) > Number(clause.value);
        case "lt":
          return Number(cell) < Number(clause.value);
        default:
          return true;
      }
    })
  );
}

export interface FieldStatistics {
  field: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  average: number;
  standardDeviation: number;
}

export function calculateStatistics<T extends Record<string, string | number>>(
  rows: T[],
  field: string
): FieldStatistics {
  const values = rows.map((r) => Number(r[field])).filter((v) => !Number.isNaN(v));
  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const average = count > 0 ? sum / count : 0;
  const variance =
    count > 0 ? values.reduce((acc, v) => acc + (v - average) ** 2, 0) / count : 0;

  return {
    field,
    count,
    sum,
    min: count > 0 ? Math.min(...values) : 0,
    max: count > 0 ? Math.max(...values) : 0,
    average,
    standardDeviation: Math.sqrt(variance),
  };
}
