import { NextRequest, NextResponse } from "next/server";
import { getServiceAlerts } from "@/lib/translink";
import { summarizeAlerts } from "@/lib/aiSummarizer";
import { ServiceAlert } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const alerts = await getServiceAlerts();
  const summarized = await summarizeAlerts(alerts);
  return NextResponse.json(
    { alerts: summarized, generatedAt: Date.now() },
    { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=15" } }
  );
}

export async function POST(request: NextRequest) {
  let alerts: ServiceAlert[] | undefined;
  try {
    const body = await request.json();
    if (Array.isArray(body?.alerts)) {
      alerts = body.alerts;
    }
  } catch {
    // No/invalid body — fall back to live alert feed below.
  }

  const source = alerts ?? (await getServiceAlerts());
  const summarized = await summarizeAlerts(source);
  return NextResponse.json({ alerts: summarized, generatedAt: Date.now() });
}
