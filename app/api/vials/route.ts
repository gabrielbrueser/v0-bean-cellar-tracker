import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

// GET /api/vials — list doses for a cellar
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cellarId = searchParams.get("cellarId");
  
  // REQUIRE cellarId to prevent returning all doses
  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }
  
  const sql = getDb();
  const rows = await sql`
    SELECT v.*, dt.name as dose_type_name, dt.grams_per_dose, dt.prefix,
      fs.id as fill_session_id, c.coffee_name, c.roaster
    FROM vials v
    JOIN dose_types dt ON v.dose_type_id = dt.id
    LEFT JOIN fill_sessions fs ON fs.vial_id = v.id AND fs.status = 'FULL'
    LEFT JOIN coffees c ON c.id = fs.coffee_id
    WHERE v.cellar_id = ${cellarId}
    ORDER BY v.created_at DESC
  `;
  const vials = rows.map((r) => ({
    id: r.id,
    vialCode: r.vial_code,
    doseTypeId: r.dose_type_id,
    doseTypeName: r.dose_type_name,
    gramsPerDose: r.grams_per_dose,
    qrValue: r.qr_value,
    status: r.status,
    createdAt: r.created_at,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
  }));
  return NextResponse.json(vials, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/**
 * Compute the lowest available label number for a given prefix.
 * Returns the smallest positive integer not currently in use.
 */
async function computeLowestAvailableNumber(sql: ReturnType<typeof getDb>, prefix: string): Promise<number> {
  const existingRows = await sql`
    SELECT 
      CAST(SUBSTRING(vial_code FROM '[0-9]+$') AS INTEGER) as label_num
    FROM vials
    WHERE vial_code LIKE ${prefix + '-%'}
    ORDER BY label_num ASC
  `;
  
  const existingNumbers = new Set(existingRows.map(r => r.label_num));
  
  // Find the lowest missing positive integer
  let nextNum = 1;
  while (existingNumbers.has(nextNum)) {
    nextNum++;
  }
  
  return nextNum;
}

/**
 * Create a new empty dose using non-transactional approach.
 * Uses retry-on-conflict for concurrency safety.
 * 
 * Algorithm:
 * 1. Compute candidate number (lowest available)
 * 2. Attempt INSERT with that number
 * 3. If unique constraint violation, recompute and retry (max 5 tries)
 */
export async function POST(req: NextRequest) {
  const MAX_RETRIES = 5;
  const { searchParams } = new URL(req.url);
  const cellarId = searchParams.get("cellarId");
  
  // REQUIRE cellarId to ensure dose is created in correct cellar
  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }
  
  try {
    const body = await req.json();
    const { doseTypeId } = body;
    
    if (!doseTypeId) {
      return NextResponse.json({ error: "doseTypeId is required" }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      console.error("[DOSE_CREATE] DATABASE_URL not configured");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const sql = getDb();

    // Get dose type prefix
    const dts = await sql`SELECT prefix FROM dose_types WHERE id = ${doseTypeId}`;
    if (dts.length === 0) {
      return NextResponse.json({ error: "Invalid dose type" }, { status: 400 });
    }
    const prefix = dts[0].prefix;

    // Retry loop for concurrency safety
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Compute lowest available number
        const seq = await computeLowestAvailableNumber(sql, prefix);
        const doseCode = `${prefix}-${String(seq).padStart(3, "0")}`;
        const qrValue = doseCode; // QR encodes just the dose code
        const id = randomUUID();

        // Attempt insert - will fail with unique constraint if another request got there first
        const rows = await sql`
          INSERT INTO vials (id, dose_type_id, vial_code, qr_value, status, is_frozen, cellar_id)
          VALUES (${id}, ${doseTypeId}, ${doseCode}, ${qrValue}, 'EMPTY', false, ${cellarId})
          RETURNING *
        `;

        const r = rows[0];
        console.log(`[DOSE_CREATE] Created dose ${doseCode} on attempt ${attempt}`);
        
        return NextResponse.json({
          id: r.id,
          vialCode: r.vial_code,
          doseTypeId: r.dose_type_id,
          qrValue: r.qr_value,
          createdAt: r.created_at,
          status: r.status,
        });
      } catch (insertError) {
        const errorMessage = insertError instanceof Error ? insertError.message : String(insertError);
        
        // Check if it's a unique constraint violation (PostgreSQL error code 23505)
        if (errorMessage.includes('23505') || errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
          console.log(`[DOSE_CREATE] Conflict on attempt ${attempt}, retrying...`);
          if (attempt === MAX_RETRIES) {
            console.error(`[DOSE_CREATE] Max retries exceeded`);
            return NextResponse.json(
              { error: "Couldn't create new dose. Please try again." },
              { status: 409 }
            );
          }
          // Continue to next attempt
          continue;
        }
        
        // Not a conflict error, rethrow
        throw insertError;
      }
    }

    // Should not reach here
    return NextResponse.json(
      { error: "Couldn't create new dose. Please try again." },
      { status: 500 }
    );
  } catch (error) {
    console.error("[DOSE_CREATE] Failed to create dose:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Couldn't create new dose. Please try again.` },
      { status: 500 }
    );
  }
}
