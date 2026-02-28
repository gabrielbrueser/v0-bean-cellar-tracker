import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();

  const [weekStats, monthStats, allTimeStats] = await Promise.all([
    sql`
      SELECT 
        COUNT(*)::int as cups,
        COALESCE(SUM(dose_grams), 0)::numeric as grams
      FROM brew_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
    `,
    sql`
      SELECT 
        COUNT(*)::int as cups,
        COALESCE(SUM(dose_grams), 0)::numeric as grams
      FROM brew_logs
      WHERE created_at >= DATE_TRUNC('month', NOW())
    `,
    sql`
      SELECT 
        COUNT(*)::int as cups,
        COALESCE(SUM(dose_grams), 0)::numeric as grams
      FROM brew_logs
    `,
  ]);

  return NextResponse.json({
    weekCups: weekStats[0]?.cups || 0,
    weekGrams: Math.round(parseFloat(weekStats[0]?.grams) || 0),
    monthCups: monthStats[0]?.cups || 0,
    monthGrams: Math.round(parseFloat(monthStats[0]?.grams) || 0),
    allTimeCups: allTimeStats[0]?.cups || 0,
    allTimeGrams: Math.round(parseFloat(allTimeStats[0]?.grams) || 0),
  });
}
