import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const cellarId = searchParams.get("cellarId");

  // REQUIRE cellarId to prevent returning all data
  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }

  const [weekStats, monthStats, allTimeStats] = await Promise.all([
    sql`
      SELECT 
        COUNT(*)::int as cups,
        COALESCE(SUM(dose_grams), 0)::numeric as grams
      FROM brew_logs
      WHERE created_at > NOW() - INTERVAL '7 days' 
        AND cellar_id = ${cellarId}
        AND deleted_at IS NULL
    `,
    sql`
      SELECT 
        COUNT(*)::int as cups,
        COALESCE(SUM(dose_grams), 0)::numeric as grams
      FROM brew_logs
      WHERE created_at >= DATE_TRUNC('month', NOW()) 
        AND cellar_id = ${cellarId}
        AND deleted_at IS NULL
    `,
    sql`
      SELECT 
        COUNT(*)::int as cups,
        COALESCE(SUM(dose_grams), 0)::numeric as grams
      FROM brew_logs
      WHERE cellar_id = ${cellarId}
        AND deleted_at IS NULL
    `,
  ]);

  return NextResponse.json({
    weekCups: weekStats[0]?.cups || 0,
    weekGrams: Math.round(parseFloat(weekStats[0]?.grams) || 0),
    monthCups: monthStats[0]?.cups || 0,
    monthGrams: Math.round(parseFloat(monthStats[0]?.grams) || 0),
    allTimeCups: allTimeStats[0]?.cups || 0,
    allTimeGrams: Math.round(parseFloat(allTimeStats[0]?.grams) || 0),
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
