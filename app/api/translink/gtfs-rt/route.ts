import { NextResponse } from "next/server";
import { getServiceAlerts, getVehiclePositions, isLiveDataConfigured } from "@/lib/translink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [vehicles, alerts] = await Promise.all([
    getVehiclePositions(),
    getServiceAlerts(),
  ]);

  return NextResponse.json(
    {
      vehicles,
      alerts,
      live: isLiveDataConfigured,
      generatedAt: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "s-maxage=10, stale-while-revalidate=5",
      },
    }
  );
}
