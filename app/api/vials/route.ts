import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/vials — list all vials
export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM vials ORDER BY created_at DESC`;
  const vials = rows.map((r) => ({
    id: r.id,
    vialCode: r.vial_code,
    doseTypeId: r.dose_type_id,
    qrValue: r.qr_value,
    createdAt: r.created_at,
    status: r.status,
  }));
  return NextResponse.json(vials);
}

// POST /api/vials — create a new vial
export async function POST(req: NextRequest) {
  const { doseTypeId } = await req.json();
  const sql = getDb();

  // Get dose type prefix
  const dts = await sql`SELECT prefix FROM dose_types WHERE id = ${doseTypeId}`;
  if (dts.length === 0) {
    return NextResponse.json({ error: "Invalid dose type" }, { status: 400 });
  }
  const prefix = dts[0].prefix;

  // Get next counter
  const counters = await sql`
    UPDATE counters SET value = value + 1 WHERE key = ${"vial_seq"} RETURNING value
  `;
  let seq = 1;
  if (counters.length > 0) {
    seq = counters[0].value;
  } else {
    await sql`INSERT INTO counters (key, value) VALUES (${"vial_seq"}, 1)`;
  }

  const vialCode = `${prefix}-${String(seq).padStart(3, "0")}`;
  const qrValue = `bc:${vialCode}`;

  const rows = await sql`
    INSERT INTO vials (dose_type_id, vial_code, qr_value, status)
    VALUES (${doseTypeId}, ${vialCode}, ${qrValue}, 'EMPTY')
    RETURNING *
  `;
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
