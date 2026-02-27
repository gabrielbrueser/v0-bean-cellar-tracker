import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/vials/:id/use — mark a vial as used
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vialId } = await params;
  const sql = getDb();

  // Find the active fill session
  const sessions = await sql`
    SELECT id FROM fill_sessions WHERE vial_id = ${vialId} AND status = 'FULL' LIMIT 1
  `;
  if (sessions.length === 0) {
    return NextResponse.json({ error: "No active fill" }, { status: 400 });
  }
  const fillSessionId = sessions[0].id;

  // Mark fill as USED
  await sql`UPDATE fill_sessions SET status = 'USED' WHERE id = ${fillSessionId}`;

  // Log usage
  await sql`INSERT INTO usage_logs (fill_session_id) VALUES (${fillSessionId})`;

  // Mark vial as EMPTY
  await sql`UPDATE vials SET status = 'EMPTY' WHERE id = ${vialId}`;

  return NextResponse.json({ ok: true });
}
