import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// DEBUG ENDPOINT - Remove after debugging
// Returns coffees grouped by cellar_id for diagnosis

export async function GET() {
  // Only allow in development or with DEBUG_ENDPOINTS env var
  if (process.env.NODE_ENV === "production" && process.env.DEBUG_ENDPOINTS !== "true") {
    return NextResponse.json(
      { error: "Debug endpoints disabled in production" },
      { status: 403 }
    );
  }

  const sql = getDb();

  // Get counts by cellar_id
  const countsByCellar = await sql`
    SELECT 
      cellar_id,
      COUNT(*)::int as count
    FROM coffees
    GROUP BY cellar_id
    ORDER BY count DESC
  `;

  // Get last 10 coffees with details
  const lastTenCoffees = await sql`
    SELECT 
      id,
      coffee_name,
      roaster,
      cellar_id,
      created_at
    FROM coffees
    ORDER BY created_at DESC
    LIMIT 10
  `;

  // Get cellars for reference
  const cellars = await sql`
    SELECT id, name FROM cellars ORDER BY name
  `;

  return NextResponse.json({
    countsByCellar: countsByCellar.map(r => ({
      cellarId: r.cellar_id,
      count: r.count,
    })),
    lastTenCoffees: lastTenCoffees.map(r => ({
      id: r.id,
      coffeeName: r.coffee_name,
      roaster: r.roaster,
      cellarId: r.cellar_id,
      createdAt: r.created_at,
    })),
    cellars: cellars.map(c => ({
      id: c.id,
      name: c.name,
    })),
    nullCellarIdCount: countsByCellar.find(r => r.cellar_id === null)?.count || 0,
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
