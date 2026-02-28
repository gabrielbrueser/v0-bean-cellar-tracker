import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// DELETE /api/brew/:id — soft delete a brew log
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  // Get cellarId from query params for validation
  const { searchParams } = new URL(req.url);
  const cellarId = searchParams.get("cellarId");

  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query parameter is required" },
      { status: 400 }
    );
  }

  // Verify the brew log exists and belongs to the specified cellar
  const brewRows = await sql`
    SELECT id, cellar_id, deleted_at
    FROM brew_logs
    WHERE id = ${id}
  `;

  if (brewRows.length === 0) {
    return NextResponse.json({ error: "Brew log not found" }, { status: 404 });
  }

  const brew = brewRows[0];

  // Check if already deleted
  if (brew.deleted_at) {
    return NextResponse.json(
      { error: "Brew log already deleted" },
      { status: 400 }
    );
  }

  // Validate cellar ownership
  if (brew.cellar_id !== cellarId) {
    return NextResponse.json(
      { error: "Brew log does not belong to this cellar" },
      { status: 403 }
    );
  }

  // Soft delete by setting deleted_at (does NOT restore the dose)
  await sql`
    UPDATE brew_logs
    SET deleted_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true, deletedId: id });
}
