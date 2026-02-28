import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

// GET /api/brew/last-grind — get last grind settings for a coffee + method combo
export async function GET(req: NextRequest) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }
  
  const { searchParams } = new URL(req.url);
  const coffeeId = searchParams.get("coffeeId");
  const brewMethod = searchParams.get("brewMethod");
  
  if (!coffeeId || !brewMethod) {
    return NextResponse.json({ error: "coffeeId and brewMethod required" }, { status: 400 });
  }

  const sql = getDb();

  // Only get brews from the same cellar
  const rows = await sql`
    SELECT grind_size, grind_unit, extraction_grams, brew_feedback
    FROM brew_logs
    WHERE coffee_id = ${coffeeId} 
      AND brew_method = ${brewMethod}
      AND cellar_id = ${cellarId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ found: false });
  }

  const last = rows[0];
  return NextResponse.json({
    found: true,
    grindSize: last.grind_size,
    grindUnit: last.grind_unit,
    extractionGrams: parseFloat(last.extraction_grams),
    brewFeedback: last.brew_feedback,
  });
}
