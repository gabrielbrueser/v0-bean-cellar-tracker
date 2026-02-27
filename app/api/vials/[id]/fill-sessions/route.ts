import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/vials/:id/fill-sessions
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vialId } = await params;
  const sql = getDb();
  const rows = await sql`
    SELECT fs.*, ul.timestamp as used_at
    FROM fill_sessions fs
    LEFT JOIN usage_logs ul ON ul.fill_session_id = fs.id
    WHERE fs.vial_id = ${vialId} 
    ORDER BY fs.filled_at DESC
  `;
  const sessions = rows.map((r) => ({
    id: r.id,
    vialId: r.vial_id,
    coffeeId: r.coffee_id,
    doseTypeId: r.dose_type_id,
    roastDate: r.roast_date,
    gramsPerDose: r.grams_per_dose,
    filledAt: r.filled_at,
    usedAt: r.used_at,
    status: r.status,
  }));
  return NextResponse.json(sessions);
}
