import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// DELETE /api/activity/:id - Delete a usage log
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  try {
    // Get the usage log to find the fill session
    const logs = await sql`
      SELECT ul.fill_session_id, fs.vial_id, fs.status as fill_status
      FROM usage_logs ul
      JOIN fill_sessions fs ON fs.id = ul.fill_session_id
      WHERE ul.id = ${id}
    `;

    if (logs.length === 0) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const { fill_session_id, vial_id, fill_status } = logs[0];

    // Delete the usage log
    await sql`DELETE FROM usage_logs WHERE id = ${id}`;

    // If the fill session was marked as USED and this was its only usage log,
    // revert it back to FULL and update the vial status
    const remainingLogs = await sql`
      SELECT COUNT(*) as count FROM usage_logs WHERE fill_session_id = ${fill_session_id}
    `;

    if (fill_status === "USED" && remainingLogs[0].count === 0) {
      // Revert fill session to FULL
      await sql`UPDATE fill_sessions SET status = 'FULL' WHERE id = ${fill_session_id}`;
      // Revert vial to FULL
      await sql`UPDATE vials SET status = 'FULL' WHERE id = ${vial_id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
