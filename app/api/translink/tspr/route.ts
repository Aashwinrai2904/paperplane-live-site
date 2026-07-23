import { NextResponse } from "next/server";
import { getTsprStats, isLiveDataConfigured } from "@/lib/translink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const stats = await getTsprStats();

  return NextResponse.json(
    {
      stats,
      live: isLiveDataConfigured,
      generatedAt: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=300",
      },
    }
  );
}
