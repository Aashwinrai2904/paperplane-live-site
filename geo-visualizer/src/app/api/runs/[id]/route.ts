import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/runs/[id]">,
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Persistence is not configured" },
      { status: 404 },
    );
  }

  const { id } = await ctx.params;
  const { data, error } = await supabase
    .from("geo_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}
