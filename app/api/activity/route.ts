import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();

  // Get recent usage logs with coffee, vial, and user info
  const rows = await sql`
    SELECT
      ul.id,
      ul.timestamp,
      ul.brew_method,
      ul.notes,
      ul.grind_size,
      fs.grams_per_dose,
      fs.roast_date,
      v.vial_code,
      c.coffee_name,
      c.roaster,
      dt.name as dose_type_name,
      u.name as user_name,
      u.email as user_email
    FROM usage_logs ul
    JOIN fill_sessions fs ON fs.id = ul.fill_session_id
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    LEFT JOIN users u ON u.id = ul.created_by_user_id
    ORDER BY ul.timestamp DESC
    LIMIT 50
  `;

  const activities = rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    brewMethod: r.brew_method,
    notes: r.notes,
    grindSize: r.grind_size,
    gramsPerDose: r.grams_per_dose,
    roastDate: r.roast_date,
    vialCode: r.vial_code,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
    doseTypeName: r.dose_type_name,
    userName: r.user_name || r.user_email?.split("@")[0] || null,
  }));

  return NextResponse.json(activities);
}
