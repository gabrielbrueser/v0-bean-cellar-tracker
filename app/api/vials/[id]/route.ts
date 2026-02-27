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
  });
}
