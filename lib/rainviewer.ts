// RainViewer's public weather-maps API is free, requires no API key, and is
// CORS-enabled for browser use: https://www.rainviewer.com/api.html

const RAINVIEWER_INDEX_URL = "https://api.rainviewer.com/public/weather-maps.json";

interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerResponse {
  host?: string;
  radar?: { past?: RainViewerFrame[]; nowcast?: RainViewerFrame[] };
}

/** Fetches a {z}/{x}/{y} tile URL template for the most recent radar frame, or null if unavailable. */
export async function fetchLatestRadarTileTemplate(): Promise<string | null> {
  try {
    const res = await fetch(RAINVIEWER_INDEX_URL);
    if (!res.ok) return null;
    const data: RainViewerResponse = await res.json();
    const frames = data.radar?.past;
    if (!frames || frames.length === 0) return null;
    const latest = frames[frames.length - 1];
    const host = data.host ?? "https://tilecache.rainviewer.com";
    return `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
  } catch (err) {
    console.error("[rainviewer] failed to fetch radar frame index:", err);
    return null;
  }
}
