import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/vials/:id/freeze — toggle freeze state
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
  const rows = await sql`
    SELECT is_frozen FROM vials WHERE id = ${vialId} AND cellar_id = ${cellarId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Dose not found in this cellar" }, { status: 404 });
  }

  const isFrozen = rows[0].is_frozen;
  const newFrozenState = !isFrozen;

  if (newFrozenState) {
    // Freezing the dose
    await sql`
      UPDATE vials 
      SET is_frozen = true, frozen_at = NOW()
      WHERE id = ${vialId}
    `;
  } else {
    // Unfreezing the dose
    await sql`
      UPDATE vials 
      SET is_frozen = false, frozen_at = NULL
      WHERE id = ${vialId}
    `;
  }

  return NextResponse.json({ 
    ok: true, 
    isFrozen: newFrozenState 
  });
}
