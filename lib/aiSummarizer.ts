import { ServiceAlert } from "./types";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const EFFECT_PLAIN_ENGLISH: Record<string, string> = {
  DETOUR: "Buses are being rerouted around the affected area.",
  SIGNIFICANT_DELAYS: "Expect longer-than-normal wait and travel times.",
  REDUCED_SERVICE: "Fewer vehicles than usual are running on this line.",
  STOP_MOVED: "A stop has been temporarily relocated nearby.",
  NO_SERVICE: "This route is currently not running.",
  MODIFIED_SERVICE: "Service is running on a modified pattern today.",
  UNKNOWN_EFFECT: "Service is impacted; check the details below.",
};

/**
 * Generative AI Disruption Summarizer — turns cryptic GTFS-RT service alert
 * text into plain-English rider guidance. Uses the Anthropic Claude API when
 * ANTHROPIC_API_KEY is configured, otherwise falls back to a deterministic
 * rule-based summarizer so the feature always works in dev/preview.
 */
export async function summarizeAlerts(
  alerts: ServiceAlert[]
): Promise<ServiceAlert[]> {
  if (alerts.length === 0) return alerts;

  if (ANTHROPIC_API_KEY) {
    try {
      return await summarizeWithClaude(alerts);
    } catch (err) {
      console.error("[ai] Claude summarization failed, using rule-based fallback:", err);
    }
  }
  return alerts.map(summarizeWithRules);
}

async function summarizeWithClaude(alerts: ServiceAlert[]): Promise<ServiceAlert[]> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const prompt = `You are a transit rider assistant for Metro Vancouver's TransLink. Convert each raw GTFS-RT service alert below into rider-friendly guidance.

For each alert, return a JSON array of objects with this exact shape:
[{ "id": string, "summary": "one plain-English sentence explaining what's happening", "detourAdvice": "one short, practical sentence telling riders what to do (alternate route, extra time, etc.)" }]

Only output the JSON array, nothing else.

Alerts:
${JSON.stringify(
  alerts.map((a) => ({ id: a.id, header: a.header, description: a.rawDescription, effect: a.effect })),
  null,
  2
)}`;

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed: { id: string; summary: string; detourAdvice: string }[] = JSON.parse(
    extractJsonArray(text)
  );
  const byId = new Map(parsed.map((p) => [p.id, p]));

  return alerts.map((alert) => {
    const enriched = byId.get(alert.id);
    return enriched
      ? { ...alert, aiSummary: enriched.summary, aiDetourAdvice: enriched.detourAdvice }
      : summarizeWithRules(alert);
  });
}

function extractJsonArray(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in Claude response");
  return text.slice(start, end + 1);
}

function summarizeWithRules(alert: ServiceAlert): ServiceAlert {
  const plainEffect = EFFECT_PLAIN_ENGLISH[alert.effect] ?? EFFECT_PLAIN_ENGLISH.UNKNOWN_EFFECT;
  const routes = alert.routeIds.length > 0 ? ` (Route ${alert.routeIds.join(", ")})` : "";

  const summary = `${alert.header}${routes}: ${plainEffect}`;

  let detourAdvice = "Check TransLink's Trip Planner for the latest route before you travel.";
  if (alert.effect === "DETOUR") {
    detourAdvice = "Allow extra time — your bus is taking a different street than usual.";
  } else if (alert.effect === "SIGNIFICANT_DELAYS") {
    detourAdvice = "Consider an alternate route or mode if your trip is time-sensitive.";
  } else if (alert.effect === "REDUCED_SERVICE") {
    detourAdvice = "Expect longer waits between vehicles; check real-time arrivals before heading out.";
  } else if (alert.effect === "STOP_MOVED") {
    detourAdvice = "Look for temporary signage near the usual stop location.";
  } else if (alert.effect === "NO_SERVICE") {
    detourAdvice = "Use a connecting route or alternate mode until service resumes.";
  }

  return { ...alert, aiSummary: summary, aiDetourAdvice: detourAdvice };
}
