import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/vials/lookup?qr=bc:E-001
export async function GET(req: NextRequest) {
  const qr = req.nextUrl.searchParams.get("qr");
  if (!qr) {
    return NextResponse.json(null);
  }
  const sql = getDb();
  const rows = await sql`SELECT * FROM vials WHERE qr_value = ${qr}`;
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
