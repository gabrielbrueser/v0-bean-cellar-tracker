import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const rows = await sql`SELECT * FROM vials WHERE id = ${id}`;
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
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

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
