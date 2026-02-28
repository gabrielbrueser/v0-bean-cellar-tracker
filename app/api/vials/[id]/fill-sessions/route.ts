import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

// GET /api/vials/:id/fill-sessions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }
  
  const { id: vialId } = await params;
  const sql = getDb();
  
  // Only return fill sessions for vials that belong to this cellar
  const rows = await sql`
    SELECT fs.*, ul.timestamp as used_at
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    LEFT JOIN usage_logs ul ON ul.fill_session_id = fs.id
    WHERE fs.vial_id = ${vialId} AND v.cellar_id = ${cellarId}
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
  
  return NextResponse.json(sessions, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
