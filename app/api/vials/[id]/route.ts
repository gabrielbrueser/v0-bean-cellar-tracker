import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cellarId = req.nextUrl.searchParams.get("cellarId");
  const sql = getDb();
  
  // cellarId is optional for GET (lookup by QR can be cross-cellar initially)
  // But we still filter if provided
  let rows;
  if (cellarId) {
    rows = await sql`SELECT * FROM vials WHERE id = ${id} AND cellar_id = ${cellarId}`;
  } else {
    rows = await sql`SELECT * FROM vials WHERE id = ${id}`;
  }
  
  if (rows.length === 0) {
    return NextResponse.json(null);
  }
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    vialCode: r.vial_code,
    doseTypeId: r.dose_type_id,
    qrValue: r.qr_value,
    createdAt: r.created_at,
    status: r.status,
    isFrozen: r.is_frozen ?? false,
    frozenAt: r.frozen_at ?? null,
    cellarId: r.cellar_id,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cellarId = req.nextUrl.searchParams.get("cellarId");
  const sql = getDb();

  // REQUIRE cellarId for DELETE
  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }

  // Validate dose belongs to this cellar
  const vialRows = await sql`SELECT * FROM vials WHERE id = ${id} AND cellar_id = ${cellarId}`;
  if (vialRows.length === 0) {
    return NextResponse.json(
      { error: "Dose not found in this cellar" },
      { status: 404 }
    );
  }

  try {
    // Delete related records first (cascade)
    await sql`DELETE FROM usage_logs WHERE fill_session_id IN (SELECT id FROM fill_sessions WHERE vial_id = ${id})`;
    await sql`DELETE FROM fill_sessions WHERE vial_id = ${id}`;
    await sql`DELETE FROM vials WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete vial:", error);
    return NextResponse.json(
      { error: "Failed to delete vial" },
      { status: 500 }
    );
  }
}
