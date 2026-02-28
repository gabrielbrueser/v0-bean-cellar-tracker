import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// DELETE /api/brew/:id — delete a brew log
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  // Delete the brew log (does NOT restore the dose)
  const result = await sql`
    DELETE FROM brew_logs WHERE id = ${id} RETURNING id
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: "Brew log not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
