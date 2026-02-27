import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/vials/:id/fill — fill a vial with a coffee
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vialId } = await params;
  const { coffeeId, doseTypeId, roastDate } = await req.json();
  const sql = getDb();

  // Archive any active fill session
  await sql`
    UPDATE fill_sessions SET status = 'ARCHIVED'
    WHERE vial_id = ${vialId} AND status = 'FULL'
  `;

  // Create new fill session
  const rows = await sql`
    INSERT INTO fill_sessions (vial_id, coffee_id, dose_type_id, roast_date, status)
    VALUES (${vialId}, ${coffeeId}, ${doseTypeId}, ${roastDate}, 'FULL')
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
    filledAt: r.filled_at,
    status: r.status,
  });
}
