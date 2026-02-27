import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/vials — list all vials
export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT v.*, dt.name as dose_type_name, dt.grams_per_dose, dt.prefix
    FROM vials v
    JOIN dose_types dt ON v.dose_type_id = dt.id
    ORDER BY v.created_at DESC
  `;
  const vials = rows.map((r) => ({
    id: r.id,
    vialCode: r.vial_code,
    doseTypeId: r.dose_type_id,
    doseTypeName: r.dose_type_name,
    gramsPerDose: r.grams_per_dose,
    qrValue: r.qr_value,
    status: r.status,
    createdAt: r.created_at,
  }));
  return NextResponse.json(vials);
}

// POST /api/vials — create a new vial
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doseTypeId } = body;
    
    if (!doseTypeId) {
      return NextResponse.json({ error: "doseTypeId is required" }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      console.error("[v0] DATABASE_URL not configured");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const sql = getDb();

    // Get dose type prefix
    const dts = await sql`SELECT prefix FROM dose_types WHERE id = ${doseTypeId}`;
    if (dts.length === 0) {
      return NextResponse.json({ error: "Invalid dose type" }, { status: 400 });
    }
    const prefix = dts[0].prefix;

    // Get next counter for this prefix using atomic upsert
    const counters = await sql`
      INSERT INTO counters (prefix, next_number) 
      VALUES (${prefix}, 2)
      ON CONFLICT (prefix) 
      DO UPDATE SET next_number = counters.next_number + 1
      RETURNING next_number - 1 as current_number
    `;
    const seq = counters[0].current_number;

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
  } catch (error) {
    console.error("[v0] Failed to create vial:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create vial: ${message}` },
      { status: 500 }
    );
  }
}
