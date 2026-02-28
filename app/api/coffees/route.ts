import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/coffees
export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const cellarId = searchParams.get("cellarId");
  
  // Get coffees with last brewed date and total brews, filtered by cellar (exclude deleted brews)
  const rows = cellarId ? await sql`
    SELECT 
      c.*,
      (SELECT MAX(bl.created_at) FROM brew_logs bl WHERE bl.coffee_id = c.id AND bl.deleted_at IS NULL) as last_brewed,
      (SELECT COUNT(*)::int FROM brew_logs bl WHERE bl.coffee_id = c.id AND bl.deleted_at IS NULL) as total_brews,
      (SELECT fs.roast_date FROM fill_sessions fs WHERE fs.coffee_id = c.id ORDER BY fs.created_at DESC LIMIT 1) as last_roast_date
    FROM coffees c
    WHERE c.cellar_id = ${cellarId}
    ORDER BY c.created_at DESC
  ` : await sql`
    SELECT 
      c.*,
      (SELECT MAX(bl.created_at) FROM brew_logs bl WHERE bl.coffee_id = c.id AND bl.deleted_at IS NULL) as last_brewed,
      (SELECT COUNT(*)::int FROM brew_logs bl WHERE bl.coffee_id = c.id AND bl.deleted_at IS NULL) as total_brews,
      (SELECT fs.roast_date FROM fill_sessions fs WHERE fs.coffee_id = c.id ORDER BY fs.created_at DESC LIMIT 1) as last_roast_date
    FROM coffees c
    ORDER BY c.created_at DESC
  `;
  
  const coffees = rows.map((r) => ({
    id: r.id,
    roaster: r.roaster,
    coffeeName: r.coffee_name,
    score: r.score,
    origin: r.origin,
    originCountry: r.origin_country,
    producer: r.producer,
    variety: r.variety,
    altitude: r.altitude,
    tastingNotes: r.tasting_notes,
    notes: r.notes,
    link: r.link,
    processMethodId: r.process_method_id,
    color: r.color,
    archived: r.archived ?? false,
    createdAt: r.created_at,
    lastBrewed: r.last_brewed,
    totalBrews: r.total_brews || 0,
    lastRoastDate: r.last_roast_date,
  }));
  return NextResponse.json(coffees);
}

// POST /api/coffees
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sql = getDb();
  
  // cellarId is REQUIRED - must be passed from client
  const cellarId = body.cellarId;
  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId is required to create a coffee" },
      { status: 400 }
    );
  }
  
  const rows = await sql`
    INSERT INTO coffees (roaster, coffee_name, score, origin, producer, variety, altitude, tasting_notes, notes, link, process_method_id, color, cellar_id)
    VALUES (${body.roaster || "Tanat"}, ${body.coffeeName}, ${body.score || 0}, ${body.origin}, ${body.producer || ""}, ${body.variety || ""}, ${body.altitude || ""}, ${body.tastingNotes || ""}, ${body.notes || ""}, ${body.link || ""}, ${body.processMethodId || null}, ${body.color || null}, ${cellarId})
    RETURNING *
  `;
  
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Failed to create coffee" },
      { status: 500 }
    );
  }
  
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    roaster: r.roaster,
    coffeeName: r.coffee_name,
    score: r.score,
    origin: r.origin,
    producer: r.producer,
    variety: r.variety,
    altitude: r.altitude,
    tastingNotes: r.tasting_notes,
    notes: r.notes,
    link: r.link,
    processMethodId: r.process_method_id,
    color: r.color,
    cellarId: r.cellar_id,
    archived: r.archived ?? false,
    createdAt: r.created_at,
  });
}
