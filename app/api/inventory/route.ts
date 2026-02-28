import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const cellarId = searchParams.get("cellarId");
  
  // Get all SEALED doses grouped by coffee, dose type, and frozen state
  // Sealed = FULL status in fill_sessions
  // Filter by cellar if provided
  const rows = cellarId ? await sql`
    SELECT
      c.id AS coffee_id,
      c.coffee_name,
      c.roaster,
      dt.id AS dose_type_id,
      dt.name AS dose_type_name,
      dt.grams_per_dose,
      COALESCE(v.is_frozen, false) AS is_frozen,
      fs.roast_date,
      COUNT(v.id)::int AS count,
      json_agg(
        json_build_object(
          'id', v.id,
          'vialCode', v.vial_code,
          'doseTypeId', v.dose_type_id,
          'isFrozen', COALESCE(v.is_frozen, false),
          'frozenAt', v.frozen_at,
          'sealedAt', fs.filled_at
        ) ORDER BY fs.filled_at ASC
      ) AS doses
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL' AND c.cellar_id = ${cellarId}
    GROUP BY c.id, c.coffee_name, c.roaster, dt.id, dt.name, dt.grams_per_dose, COALESCE(v.is_frozen, false), fs.roast_date
    ORDER BY c.coffee_name, dt.name, COALESCE(v.is_frozen, false)
  ` : await sql`
    SELECT
      c.id AS coffee_id,
      c.coffee_name,
      c.roaster,
      dt.id AS dose_type_id,
      dt.name AS dose_type_name,
      dt.grams_per_dose,
      COALESCE(v.is_frozen, false) AS is_frozen,
      fs.roast_date,
      COUNT(v.id)::int AS count,
      json_agg(
        json_build_object(
          'id', v.id,
          'vialCode', v.vial_code,
          'doseTypeId', v.dose_type_id,
          'isFrozen', COALESCE(v.is_frozen, false),
          'frozenAt', v.frozen_at,
          'sealedAt', fs.filled_at
        ) ORDER BY fs.filled_at ASC
      ) AS doses
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL'
    GROUP BY c.id, c.coffee_name, c.roaster, dt.id, dt.name, dt.grams_per_dose, COALESCE(v.is_frozen, false), fs.roast_date
    ORDER BY c.coffee_name, dt.name, COALESCE(v.is_frozen, false)
  `;

  const groups = rows.map((r) => ({
    coffeeId: r.coffee_id,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
    doseTypeId: r.dose_type_id,
    doseTypeName: r.dose_type_name,
    gramsPerDose: r.grams_per_dose,
    isFrozen: r.is_frozen,
    roastDate: r.roast_date,
    count: r.count,
    doses: r.doses,
  }));

  return NextResponse.json(groups);
}
