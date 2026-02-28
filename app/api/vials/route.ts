import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/vials — list all vials
export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT v.*, dt.name as dose_type_name, dt.grams_per_dose, dt.prefix
    FROM vials v
    JOIN dose_types dt ON v.dose_type_id = dt.id
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
  }));
  return NextResponse.json(vials);
}

/**
 * Generate the next available label for a given prefix using gap-filling.
 * This ensures labels are always sequential and reuses deleted label numbers.
 * 
 * Algorithm:
 * 1. Get all existing label numbers for this prefix
 * 2. Find the lowest missing positive integer (gap)
 * 3. If no gap exists, use max + 1
 * 4. Return the formatted label code (e.g., ESP-004)
 */
async function getNextAvailableLabelNumber(sql: ReturnType<typeof getDb>, prefix: string): Promise<number> {
  // Get all existing label numbers for this prefix
  // Extract the numeric part from vial_code like "ESP-001" -> 1
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

// POST /api/vials — create a new vial
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doseTypeId } = body;
    
    if (!doseTypeId) {
      return NextResponse.json({ error: "doseTypeId is required" }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      console.error("[v0] DATABASE_URL not configured");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const sql = getDb();

    // Get dose type prefix
    const dts = await sql`SELECT prefix FROM dose_types WHERE id = ${doseTypeId}`;
    if (dts.length === 0) {
      return NextResponse.json({ error: "Invalid dose type" }, { status: 400 });
    }
    const prefix = dts[0].prefix;

    // Use advisory lock to prevent concurrent label assignment collision
    // Lock key is based on prefix hash to ensure different prefixes don't block each other
    const lockKey = prefix.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    
    // Acquire lock, get next number, create vial, release lock - all in one transaction
    const rows = await sql.begin(async (tx) => {
      // Acquire advisory lock for this prefix
      await tx`SELECT pg_advisory_xact_lock(${lockKey})`;
      
      // Get next available label number (gap-filling)
      const seq = await getNextAvailableLabelNumber(tx, prefix);
      
      const vialCode = `${prefix}-${String(seq).padStart(3, "0")}`;
      const qrValue = `bc:${vialCode}`;

      const result = await tx`
        INSERT INTO vials (dose_type_id, vial_code, qr_value, status)
        VALUES (${doseTypeId}, ${vialCode}, ${qrValue}, 'EMPTY')
        RETURNING *
      `;
      
      return result;
    });

    const r = rows[0];
    return NextResponse.json({
      id: r.id,
      vialCode: r.vial_code,
      doseTypeId: r.dose_type_id,
      qrValue: r.qr_value,
      createdAt: r.created_at,
      status: r.status,
    });
  } catch (error) {
    console.error("[v0] Failed to create vial:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create vial: ${message}` },
      { status: 500 }
    );
  }
}
