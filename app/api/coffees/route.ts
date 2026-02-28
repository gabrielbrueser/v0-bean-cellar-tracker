import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

export async function GET(req: NextRequest) {
  let cellarId: string;
  try {
    // Correctly uses your internal security helper
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }

  const sql = getDb();

  try {
    // The ::uuid cast is critical to stop the 500 errors
    const rows = await sql`
      SELECT * FROM coffees 
      WHERE cellar_id = ${cellarId}::uuid 
      AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Coffee API Error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}