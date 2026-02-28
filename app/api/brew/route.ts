import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/brew — create a brew log (single source of truth)
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id || null;
  const sql = getDb();

  const body = await req.json();
  const {
    doseId,
    brewMethod,
    doseGrams,
    grindSize,
    extractionGrams,
    brewFeedback,
    notes,
  } = body;

  // Validate required fields
  if (!doseId || !brewMethod || !doseGrams || !grindSize || !extractionGrams || !brewFeedback) {
    return NextResponse.json(
      { error: "Missing required fields: doseId, brewMethod, doseGrams, grindSize, extractionGrams, brewFeedback" },
      { status: 400 }
    );
  }

  if (!["espresso", "filter"].includes(brewMethod)) {
    return NextResponse.json({ error: "brewMethod must be 'espresso' or 'filter'" }, { status: 400 });
  }

  if (!["fast", "good", "slow"].includes(brewFeedback)) {
    return NextResponse.json({ error: "brewFeedback must be 'fast', 'good', or 'slow'" }, { status: 400 });
  }

  // Get the dose and its active fill session
  const doseRows = await sql`
    SELECT 
      v.id as vial_id,
      v.status,
      fs.id as fill_session_id,
      fs.coffee_id,
      c.cellar_id
    FROM vials v
    LEFT JOIN fill_sessions fs ON fs.vial_id = v.id AND fs.status = 'FULL'
    LEFT JOIN coffees c ON c.id = fs.coffee_id
    WHERE v.id = ${doseId}
  `;

  if (doseRows.length === 0) {
    return NextResponse.json({ error: "Dose not found" }, { status: 404 });
  }

  const dose = doseRows[0];
  
  if (dose.status !== "FULL" || !dose.fill_session_id) {
    return NextResponse.json({ error: "Dose is not sealed - cannot brew" }, { status: 400 });
  }

  const grindUnit = brewMethod === "espresso" ? "espresso-scale" : "comandante-clicks";
  const cellarId = dose.cellar_id || null;
  const coffeeId = dose.coffee_id;

  // Start transaction-like operations
  try {
    // 1. Create the BrewLog (single source of truth)
    const brewLogRows = await sql`
      INSERT INTO brew_logs (
        user_id, cellar_id, coffee_id, dose_id, brew_method,
        dose_grams, grind_size, grind_unit, extraction_grams, brew_feedback, notes
      ) VALUES (
        ${userId}, ${cellarId}, ${coffeeId}, ${doseId}, ${brewMethod},
        ${doseGrams}, ${grindSize}, ${grindUnit}, ${extractionGrams}, ${brewFeedback}, ${notes || null}
      )
      RETURNING id, created_at
    `;

    if (brewLogRows.length === 0) {
      throw new Error("Failed to create brew log");
    }

    const brewLog = brewLogRows[0];

    // 2. Mark fill session as USED
    await sql`UPDATE fill_sessions SET status = 'USED' WHERE id = ${dose.fill_session_id}`;

    // 3. Mark dose as EMPTY
    await sql`UPDATE vials SET status = 'EMPTY' WHERE id = ${doseId}`;

    return NextResponse.json({
      ok: true,
      brewLogId: brewLog.id,
      createdAt: brewLog.created_at,
    });

  } catch (error) {
    console.error("Brew failed:", error);
    return NextResponse.json(
      { error: "Failed to create brew log - brew aborted" },
      { status: 500 }
    );
  }
}

// GET /api/brew — get brew logs for activity history
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const cellarId = searchParams.get("cellarId");
  const sql = getDb();

  const rows = cellarId ? await sql`
    SELECT
      bl.id,
      bl.user_id,
      bl.cellar_id,
      bl.coffee_id,
      bl.dose_id,
      bl.brew_method,
      bl.dose_grams,
      bl.grind_size,
      bl.grind_unit,
      bl.extraction_grams,
      bl.brew_feedback,
      bl.notes,
      bl.created_at,
      c.coffee_name,
      c.roaster,
      v.vial_code,
      u.name as user_name,
      u.email as user_email
    FROM brew_logs bl
    JOIN coffees c ON c.id = bl.coffee_id
    JOIN vials v ON v.id = bl.dose_id
    LEFT JOIN users u ON u.id = bl.user_id
    WHERE bl.cellar_id = ${cellarId}
    ORDER BY bl.created_at DESC
    LIMIT ${limit}
  ` : await sql`
    SELECT
      bl.id,
      bl.user_id,
      bl.cellar_id,
      bl.coffee_id,
      bl.dose_id,
      bl.brew_method,
      bl.dose_grams,
      bl.grind_size,
      bl.grind_unit,
      bl.extraction_grams,
      bl.brew_feedback,
      bl.notes,
      bl.created_at,
      c.coffee_name,
      c.roaster,
      v.vial_code,
      u.name as user_name,
      u.email as user_email
    FROM brew_logs bl
    JOIN coffees c ON c.id = bl.coffee_id
    JOIN vials v ON v.id = bl.dose_id
    LEFT JOIN users u ON u.id = bl.user_id
    ORDER BY bl.created_at DESC
    LIMIT ${limit}
  `;

  const brewLogs = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    cellarId: r.cellar_id,
    coffeeId: r.coffee_id,
    doseId: r.dose_id,
    brewMethod: r.brew_method,
    doseGrams: parseFloat(r.dose_grams),
    grindSize: r.grind_size,
    grindUnit: r.grind_unit,
    extractionGrams: parseFloat(r.extraction_grams),
    brewFeedback: r.brew_feedback,
    notes: r.notes,
    createdAt: r.created_at,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
    vialCode: r.vial_code,
    userName: r.user_name || r.user_email?.split("@")[0] || null,
  }));

  return NextResponse.json(brewLogs);
}
