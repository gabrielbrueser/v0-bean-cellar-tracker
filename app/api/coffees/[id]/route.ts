import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/coffees/:id
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const rows = await sql`SELECT * FROM coffees WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json(null);
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
    createdAt: r.created_at,
  });
}

// PUT /api/coffees/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const sql = getDb();
  const rows = await sql`
    UPDATE coffees SET
      roaster = ${body.roaster},
      coffee_name = ${body.coffeeName},
      score = ${body.score || 0},
      origin = ${body.origin},
      producer = ${body.producer || ""},
      variety = ${body.variety || ""},
      altitude = ${body.altitude || ""},
      tasting_notes = ${body.tastingNotes || ""},
      notes = ${body.notes || ""},
      link = ${body.link || ""},
      process_method_id = ${body.processMethodId || null}
    WHERE id = ${id}
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
    createdAt: r.created_at,
  });
}
