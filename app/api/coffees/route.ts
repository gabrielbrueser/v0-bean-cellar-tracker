import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/coffees
export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM coffees ORDER BY created_at DESC`;
  const coffees = rows.map((r) => ({
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
    archived: r.archived ?? false,
    createdAt: r.created_at,
  }));
  return NextResponse.json(coffees);
}

// POST /api/coffees
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    INSERT INTO coffees (roaster, coffee_name, score, origin, producer, variety, altitude, tasting_notes, notes, link, process_method_id, color)
    VALUES (${body.roaster || "Tanat"}, ${body.coffeeName}, ${body.score || 0}, ${body.origin}, ${body.producer || ""}, ${body.variety || ""}, ${body.altitude || ""}, ${body.tastingNotes || ""}, ${body.notes || ""}, ${body.link || ""}, ${body.processMethodId || null}, ${body.color || null})
    RETURNING *
  `;
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
    archived: r.archived ?? false,
    createdAt: r.created_at,
  });
}
