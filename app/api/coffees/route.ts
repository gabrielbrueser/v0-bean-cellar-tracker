import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

export async function GET(req: NextRequest) {
  let cellarId: string;
  try {
    // This uses your project's internal security check
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }

  const sql = getDb();

  try {
    // We add ::uuid to tell the database exactly what type of ID this is
    const rows = await sql`
      SELECT * FROM coffees 
      WHERE cellar_id = ${cellarId}::uuid 
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}