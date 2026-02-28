import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/vials/:id/fill — fill a vial with a coffee
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vialId } = await params;
  const cellarId = req.nextUrl.searchParams.get("cellarId");
  const sql = getDb();

  // REQUIRE cellarId
  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }

  // Validate dose belongs to this cellar
  const vialRows = await sql`SELECT * FROM vials WHERE id = ${vialId} AND cellar_id = ${cellarId}`;
  if (vialRows.length === 0) {
    return NextResponse.json(
      { error: "Dose not found in this cellar" },
      { status: 404 }
    );
  }

  const { coffeeId, doseTypeId, roastDate, gramsPerDose } = await req.json();

  // Validate coffee belongs to this cellar
  const coffeeRows = await sql`SELECT * FROM coffees WHERE id = ${coffeeId} AND cellar_id = ${cellarId}`;
  if (coffeeRows.length === 0) {
    return NextResponse.json(
      { error: "Coffee does not belong to this cellar" },
      { status: 400 }
    );
  }

  // Archive any active fill session
  await sql`
    UPDATE fill_sessions SET status = 'ARCHIVED'
    WHERE vial_id = ${vialId} AND status = 'FULL'
  `;

  // Create new fill session with custom grams
  const rows = await sql`
    INSERT INTO fill_sessions (vial_id, coffee_id, dose_type_id, roast_date, grams_per_dose, status)
    VALUES (${vialId}, ${coffeeId}, ${doseTypeId}, ${roastDate}, ${gramsPerDose}, 'FULL')
    RETURNING *
  `;

  // Mark vial as FULL
  await sql`UPDATE vials SET status = 'FULL' WHERE id = ${vialId}`;

  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    vialId: r.vial_id,
    coffeeId: r.coffee_id,
    doseTypeId: r.dose_type_id,
    roastDate: r.roast_date,
    gramsPerDose: r.grams_per_dose,
    filledAt: r.filled_at,
    status: r.status,
  });
}
