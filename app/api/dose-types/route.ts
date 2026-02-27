import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM dose_types ORDER BY name ASC`;
  const doseTypes = rows.map((r) => ({
    id: r.id,
    name: r.name,
    gramsPerDose: r.grams_per_dose,
    prefix: r.prefix,
  }));
  return NextResponse.json(doseTypes);
}
