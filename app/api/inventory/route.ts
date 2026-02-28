import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireCellarId } from "@/lib/api/cellar";

interface Dose {
  id: string;
  vialCode: string;
  doseTypeId: string;
  isFrozen: boolean;
  frozenAt: string | null;
  sealedAt: string;
}

interface InventoryGroup {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  doseTypeId: string;
  doseTypeName: string;
  gramsPerDose: number;
  isFrozen: boolean;
  roastDate: string | null;
  count: number;
  doses: Dose[];
}

export async function GET(req: NextRequest) {
  let cellarId: string;
  try {
    cellarId = requireCellarId(req);
  } catch (response) {
    return response as NextResponse;
  }

  const sql = getDb();

  try {
    // Get all FULL vials with their fill session and coffee info
    const rows = await sql`
      SELECT 
        v.id as vial_id,
        v.vial_code,
        v.dose_type_id,
        v.is_frozen,
        v.frozen_at,
        fs.sealed_at,
        fs.roast_date,
        fs.coffee_id,
        c.coffee_name,
        c.roaster,
        dt.name as dose_type_name,
        dt.grams_per_dose
      FROM vials v
      JOIN fill_sessions fs ON fs.vial_id = v.id AND fs.status = 'FULL'
      JOIN coffees c ON c.id = fs.coffee_id
      JOIN dose_types dt ON dt.id = v.dose_type_id
      WHERE v.cellar_id = ${cellarId}::uuid
        AND v.status = 'FULL'
      ORDER BY fs.sealed_at ASC
    `;

    // Group by coffee + dose type + frozen status
    const groupMap = new Map<string, InventoryGroup>();
    
    for (const row of rows) {
      const key = `${row.coffee_id}|${row.dose_type_id}|${row.is_frozen}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          coffeeId: row.coffee_id,
          coffeeName: row.coffee_name,
          roaster: row.roaster,
          doseTypeId: row.dose_type_id,
          doseTypeName: row.dose_type_name,
          gramsPerDose: Number(row.grams_per_dose),
          isFrozen: row.is_frozen,
          roastDate: row.roast_date ? row.roast_date.toISOString().split('T')[0] : null,
          count: 0,
          doses: [],
        });
      }
      
      const group = groupMap.get(key)!;
      group.count++;
      group.doses.push({
        id: row.vial_id,
        vialCode: row.vial_code,
        doseTypeId: row.dose_type_id,
        isFrozen: row.is_frozen,
        frozenAt: row.frozen_at ? row.frozen_at.toISOString() : null,
        sealedAt: row.sealed_at ? row.sealed_at.toISOString() : new Date().toISOString(),
      });
    }

    // Convert to array and sort by count descending
    const groups = Array.from(groupMap.values()).sort((a, b) => b.count - a.count);

    return NextResponse.json(groups, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Inventory API error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
