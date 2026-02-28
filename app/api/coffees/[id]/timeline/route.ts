import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

// GET /api/coffees/:id/timeline - Get brew history and stats for a coffee
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }
  
  const { id: coffeeId } = await params;
  const sql = getDb();

  // Verify coffee belongs to this cellar
  const coffeeCheck = await sql`
    SELECT id FROM coffees WHERE id = ${coffeeId}::uuid AND cellar_id = ${cellarId}::uuid
  `;
  if (coffeeCheck.length === 0) {
    return NextResponse.json(
      { error: "Coffee not found in this cellar" },
      { status: 404 }
    );
  }

  // Get all brew logs for this coffee with fill session info
  const brews = await sql`
    SELECT 
      ul.id,
      ul.timestamp,
      ul.brew_method,
      ul.grind_size,
      fs.roast_date,
      fs.grams_per_dose,
      v.vial_code
    FROM usage_logs ul
    JOIN fill_sessions fs ON fs.id = ul.fill_session_id
    JOIN vials v ON v.id = fs.vial_id
    WHERE fs.coffee_id = ${coffeeId}
    ORDER BY ul.timestamp DESC
    LIMIT 50
  `;

  // Get stats
  const statsResult = await sql`
    SELECT 
      COUNT(ul.id) as total_brews,
      MAX(ul.timestamp) as last_brewed,
      MIN(ul.timestamp) as first_brewed
    FROM usage_logs ul
    JOIN fill_sessions fs ON fs.id = ul.fill_session_id
    WHERE fs.coffee_id = ${coffeeId}
  `;

  const stats = statsResult[0] || { total_brews: 0, last_brewed: null, first_brewed: null };

  // Get grind size stats by brew method
  const grindStats = await sql`
    SELECT 
      ul.brew_method,
      AVG(ul.grind_size) as avg_grind,
      MIN(ul.grind_size) as min_grind,
      MAX(ul.grind_size) as max_grind,
      COUNT(ul.id) as count
    FROM usage_logs ul
    JOIN fill_sessions fs ON fs.id = ul.fill_session_id
    WHERE fs.coffee_id = ${coffeeId} AND ul.grind_size IS NOT NULL
    GROUP BY ul.brew_method
  `;

  return NextResponse.json({
    brews: brews.map((b) => ({
      id: b.id,
      timestamp: b.timestamp,
      brewMethod: b.brew_method,
      grindSize: b.grind_size,
      roastDate: b.roast_date,
      gramsPerDose: b.grams_per_dose,
      vialCode: b.vial_code,
    })),
    stats: {
      totalBrews: Number(stats.total_brews),
      lastBrewed: stats.last_brewed,
      firstBrewed: stats.first_brewed,
    },
    grindStats: grindStats.map((g) => ({
      brewMethod: g.brew_method,
      avgGrind: g.avg_grind ? Math.round(Number(g.avg_grind) * 10) / 10 : null,
      minGrind: g.min_grind,
      maxGrind: g.max_grind,
      count: Number(g.count),
    })),
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
