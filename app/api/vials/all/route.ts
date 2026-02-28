import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/vials/all?cellarId=xxx&status=FULL|EMPTY
export async function GET(req: NextRequest) {
  const sql = getDb();
  const cellarId = req.nextUrl.searchParams.get("cellarId");
  const status = req.nextUrl.searchParams.get("status");

  // REQUIRE cellarId to prevent returning all doses across cellars
  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }

  let rows;
  if (status === "FULL" || status === "EMPTY") {
    rows = await sql`
      SELECT v.*, dt.name as dose_type_name, dt.grams_per_dose,
        fs.id as fill_session_id, c.coffee_name, c.roaster
      FROM vials v
      JOIN dose_types dt ON dt.id = v.dose_type_id
      LEFT JOIN fill_sessions fs ON fs.vial_id = v.id AND fs.status = 'FULL'
      LEFT JOIN coffees c ON c.id = fs.coffee_id
      WHERE v.cellar_id = ${cellarId} AND v.status = ${status}
      ORDER BY v.created_at DESC
    `;
  } else {
    rows = await sql`
      SELECT v.*, dt.name as dose_type_name, dt.grams_per_dose,
        fs.id as fill_session_id, c.coffee_name, c.roaster
      FROM vials v
      JOIN dose_types dt ON dt.id = v.dose_type_id
      LEFT JOIN fill_sessions fs ON fs.vial_id = v.id AND fs.status = 'FULL'
      LEFT JOIN coffees c ON c.id = fs.coffee_id
      WHERE v.cellar_id = ${cellarId}
      ORDER BY v.created_at DESC
    `;
  }

  const vials = rows.map((r) => ({
    id: r.id,
    vialCode: r.vial_code,
    doseTypeId: r.dose_type_id,
    doseTypeName: r.dose_type_name,
    gramsPerDose: r.grams_per_dose,
    qrValue: r.qr_value,
    createdAt: r.created_at,
    status: r.status,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
  }));

  return NextResponse.json(vials, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
