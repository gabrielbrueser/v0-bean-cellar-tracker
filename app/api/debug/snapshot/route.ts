import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/debug/snapshot?cellarId=...
// Returns counts and last 5 rows from each table to diagnose scoping issues
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cellarId = searchParams.get("cellarId");

  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }

  const sql = getDb();

  try {
    // Coffees
    const [coffeesTotal] = await sql`SELECT COUNT(*)::int as count FROM coffees WHERE cellar_id = ${cellarId}`;
    const [coffeesNullTotal] = await sql`SELECT COUNT(*)::int as count FROM coffees WHERE cellar_id IS NULL`;
    const coffeesLast5 = await sql`
      SELECT id, coffee_name, cellar_id, created_at 
      FROM coffees 
      WHERE cellar_id = ${cellarId}
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    // Vials
    const [vialsTotal] = await sql`SELECT COUNT(*)::int as count FROM vials WHERE cellar_id = ${cellarId}`;
    const [vialsNullTotal] = await sql`SELECT COUNT(*)::int as count FROM vials WHERE cellar_id IS NULL`;
    const vialsLast5 = await sql`
      SELECT id, vial_code, cellar_id, status, created_at 
      FROM vials 
      WHERE cellar_id = ${cellarId}
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    // Brew Logs
    const [brewLogsTotal] = await sql`SELECT COUNT(*)::int as count FROM brew_logs WHERE cellar_id = ${cellarId} AND deleted_at IS NULL`;
    const [brewLogsNullTotal] = await sql`SELECT COUNT(*)::int as count FROM brew_logs WHERE cellar_id IS NULL AND deleted_at IS NULL`;
    const brewLogsLast5 = await sql`
      SELECT id, coffee_id, dose_id, cellar_id, created_at 
      FROM brew_logs 
      WHERE cellar_id = ${cellarId} AND deleted_at IS NULL
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    // Fill Sessions
    const [fillSessionsTotal] = await sql`
      SELECT COUNT(*)::int as count 
      FROM fill_sessions fs
      JOIN vials v ON v.id = fs.vial_id
      WHERE v.cellar_id = ${cellarId}
    `;
    const fillSessionsLast5 = await sql`
      SELECT fs.id, fs.coffee_id, fs.vial_id, fs.status, fs.created_at
      FROM fill_sessions fs
      JOIN vials v ON v.id = fs.vial_id
      WHERE v.cellar_id = ${cellarId}
      ORDER BY fs.created_at DESC 
      LIMIT 5
    `;

    // Cellars list
    const cellars = await sql`SELECT id, name, created_at FROM cellars ORDER BY created_at ASC`;

    return NextResponse.json({
      cellarId,
      cellars: cellars.map(c => ({ id: c.id, name: c.name, createdAt: c.created_at })),
      coffees: {
        total: coffeesTotal?.count || 0,
        nullCellarIdCount: coffeesNullTotal?.count || 0,
        last5: coffeesLast5.map(r => ({
          id: r.id,
          coffeeName: r.coffee_name,
          cellarId: r.cellar_id,
          createdAt: r.created_at,
        })),
      },
      vials: {
        total: vialsTotal?.count || 0,
        nullCellarIdCount: vialsNullTotal?.count || 0,
        last5: vialsLast5.map(r => ({
          id: r.id,
          vialCode: r.vial_code,
          cellarId: r.cellar_id,
          status: r.status,
          createdAt: r.created_at,
        })),
      },
      brewLogs: {
        total: brewLogsTotal?.count || 0,
        nullCellarIdCount: brewLogsNullTotal?.count || 0,
        last5: brewLogsLast5.map(r => ({
          id: r.id,
          coffeeId: r.coffee_id,
          doseId: r.dose_id,
          cellarId: r.cellar_id,
          createdAt: r.created_at,
        })),
      },
      fillSessions: {
        total: fillSessionsTotal?.count || 0,
        last5: fillSessionsLast5.map(r => ({
          id: r.id,
          coffeeId: r.coffee_id,
          vialId: r.vial_id,
          status: r.status,
          createdAt: r.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("Debug snapshot error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}
