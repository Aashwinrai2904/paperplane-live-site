import { GisColumn } from "./gisData";

export type ExportFormat = "json" | "csv" | "geojson" | "kml";

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function rowsToJSON<T extends Record<string, string | number>>(rows: T[]): string {
  return JSON.stringify(rows, null, 2);
}

export function rowsToCSV<T extends Record<string, string | number>>(
  rows: T[],
  columns: GisColumn[]
): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key] ?? "")).join(","));
  return [header, ...lines].join("\n");
}

export function rowsToGeoJSON<T extends Record<string, string | number>>(
  rows: T[],
  getPosition: (row: T) => [number, number]
): string {
  const featureCollection = {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: getPosition(row) },
      properties: row,
    })),
  };
  return JSON.stringify(featureCollection, null, 2);
}

function xmlEscape(v: string | number): string {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function rowsToKML<T extends Record<string, string | number>>(
  rows: T[],
  columns: GisColumn[],
  getPosition: (row: T) => [number, number],
  nameKey: string
): string {
  const placemarks = rows
    .map((row) => {
      const [lon, lat] = getPosition(row);
      const name = xmlEscape(row[nameKey] ?? "Feature");
      const description = columns
        .map((c) => `${xmlEscape(c.label)}: ${xmlEscape(row[c.key] ?? "")}`)
        .join("&#10;");
      return `  <Placemark>\n    <name>${name}</name>\n    <description>${description}</description>\n    <Point><coordinates>${lon},${lat},0</coordinates></Point>\n  </Placemark>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n${placemarks}\n</Document>\n</kml>`;
}

export function exportDataset<T extends Record<string, string | number>>(
  format: ExportFormat,
  datasetLabel: string,
  rows: T[],
  columns: GisColumn[],
  getPosition: (row: T) => [number, number],
  nameKey: string
) {
  const filename = datasetLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  switch (format) {
    case "json":
      downloadTextFile(`${filename}.json`, rowsToJSON(rows), "application/json");
      break;
    case "csv":
      downloadTextFile(`${filename}.csv`, rowsToCSV(rows, columns), "text/csv");
      break;
    case "geojson":
      downloadTextFile(`${filename}.geojson`, rowsToGeoJSON(rows, getPosition), "application/geo+json");
      break;
    case "kml":
      downloadTextFile(`${filename}.kml`, rowsToKML(rows, columns, getPosition, nameKey), "application/vnd.google-earth.kml+xml");
      break;
  }
}
