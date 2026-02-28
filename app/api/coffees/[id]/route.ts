import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

// GET /api/coffees/:id
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
  
  const { id } = await params;
  const sql = getDb();
  
  // Only return coffee if it belongs to the specified cellar
  const rows = await sql`SELECT * FROM coffees WHERE id = ${id} AND cellar_id = ${cellarId}`;
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Coffee not found in this cellar" },
      { status: 404 }
    );
  }
  const r = rows[0];
  return NextResponse.json({
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
    cellarId: r.cellar_id,
  });
}

// PUT /api/coffees/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }
  
  const { id } = await params;
  const body = await req.json();
  const sql = getDb();
  
  // Only update if coffee belongs to this cellar
  const rows = await sql`
    UPDATE coffees SET
      roaster = ${body.roaster},
      coffee_name = ${body.coffeeName},
      score = ${body.score || 0},
      origin = ${body.origin},
      origin_country = ${body.originCountry || null},
      producer = ${body.producer || ""},
      variety = ${body.variety || ""},
      altitude = ${body.altitude || ""},
      tasting_notes = ${body.tastingNotes || ""},
      notes = ${body.notes || ""},
      link = ${body.link || ""},
      process_method_id = ${body.processMethodId || null},
      color = ${body.color || null}
    WHERE id = ${id} AND cellar_id = ${cellarId}
    RETURNING *
  `;
  
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Coffee not found in this cellar" },
      { status: 404 }
    );
  }
  
  const r = rows[0];
  return NextResponse.json({
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
    cellarId: r.cellar_id,
  });
}

// PATCH /api/coffees/:id — archive/unarchive
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }
  
  const { id } = await params;
  const body = await req.json();
  const sql = getDb();
  
  if (body.archived !== undefined) {
    const result = await sql`
      UPDATE coffees SET archived = ${body.archived} 
      WHERE id = ${id} AND cellar_id = ${cellarId}
      RETURNING id
    `;
    if (result.length === 0) {
      return NextResponse.json(
        { error: "Coffee not found in this cellar" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  }
  
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// DELETE /api/coffees/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }
  
  const { id } = await params;
  const sql = getDb();
  
  const result = await sql`
    DELETE FROM coffees 
    WHERE id = ${id} AND cellar_id = ${cellarId}
    RETURNING id
  `;
  
  if (result.length === 0) {
    return NextResponse.json(
      { error: "Coffee not found in this cellar" },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ ok: true });
}
