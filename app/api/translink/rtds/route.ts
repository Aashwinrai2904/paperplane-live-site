import { NextResponse } from "next/server";
import { getCorridorSpeeds, isLiveDataConfigured } from "@/lib/translink";
import { detectBottlenecks } from "@/lib/delayPredictor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const corridors = await getCorridorSpeeds();
  const bottlenecks = detectBottlenecks(corridors);

  return NextResponse.json(
    {
      corridors,
      bottlenecks,
      live: isLiveDataConfigured,
      generatedAt: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=15",
      },
    }
  );
}
