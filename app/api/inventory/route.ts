import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT
      c.id AS coffee_id,
      c.coffee_name,
      c.roaster,
      dt.id AS dose_type_id,
      dt.name AS dose_type_name,
      dt.grams_per_dose,
      COUNT(v.id)::int AS count,
      json_agg(
        json_build_object(
          'id', v.id,
          'vialCode', v.vial_code,
          'doseTypeId', v.dose_type_id,
          'qrValue', v.qr_value,
          'createdAt', v.created_at,
          'status', v.status
        ) ORDER BY v.vial_code
      ) AS vials
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL'
    GROUP BY c.id, c.coffee_name, c.roaster, dt.id, dt.name, dt.grams_per_dose
    ORDER BY c.coffee_name, dt.name
  `;

  const groups = rows.map((r) => ({
    coffeeId: r.coffee_id,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
    doseTypeId: r.dose_type_id,
    doseTypeName: r.dose_type_name,
    gramsPerDose: r.grams_per_dose,
    count: r.count,
    vials: r.vials,
    firstVialCode: r.vials && r.vials.length > 0 ? r.vials[0].vialCode : null,
  }));

  return NextResponse.json(groups);
}
