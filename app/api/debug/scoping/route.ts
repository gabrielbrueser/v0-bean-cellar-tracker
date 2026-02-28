import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

/**
 * Debug endpoint to verify data scoping for a cellar.
 * Returns counts of coffees, vials, and brew_logs for the given cellarId.
 * Helps diagnose "missing data" issues by confirming correct cellar scope.
 */
export async function GET(req: NextRequest) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }
  
  const sql = getDb();
  
  // Get cellar info
  const cellarRows = await sql`
    SELECT id, name, created_at FROM cellars WHERE id = ${cellarId}
  `;
  
  if (cellarRows.length === 0) {
    return NextResponse.json(
      { error: "Cellar not found" },
      { status: 404 }
    );
  }
  
  const cellar = cellarRows[0];
  
  // Get counts for this cellar
  const [coffeesResult, vialsResult, brewLogsResult] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM coffees WHERE cellar_id = ${cellarId}`,
    sql`SELECT COUNT(*)::int as count FROM vials WHERE cellar_id = ${cellarId}`,
    sql`SELECT COUNT(*)::int as count FROM brew_logs WHERE cellar_id = ${cellarId}`,
  ]);
  
  // Get recent coffees for this cellar
  const recentCoffees = await sql`
    SELECT id, coffee_name, roaster, created_at 
    FROM coffees 
    WHERE cellar_id = ${cellarId} 
    ORDER BY created_at DESC 
    LIMIT 5
  `;
  
  return NextResponse.json({
    cellar: {
      id: cellar.id,
      name: cellar.name,
      createdAt: cellar.created_at,
    },
    counts: {
      coffees: coffeesResult[0]?.count || 0,
      vials: vialsResult[0]?.count || 0,
      brewLogs: brewLogsResult[0]?.count || 0,
    },
    recentCoffees: recentCoffees.map(c => ({
      id: c.id,
      coffeeName: c.coffee_name,
      roaster: c.roaster,
      createdAt: c.created_at,
    })),
    debug: {
      requestedCellarId: cellarId,
      timestamp: new Date().toISOString(),
    },
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
