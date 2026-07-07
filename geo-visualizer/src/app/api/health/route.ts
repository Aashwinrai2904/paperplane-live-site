import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    embeddingsMode: process.env.FIREWORKS_API_KEY ? "live" : "mock",
    persistence: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "none",
  });
}
