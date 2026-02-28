import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

export async function GET(req: NextRequest) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }

  const sql = getDb();

  try {
    const rows = await sql`
      SELECT * FROM brew_logs 
      WHERE cellar_id = ${cellarId}::uuid 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}