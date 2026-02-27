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

export async function PUT(request: Request) {
  const sql = getDb();
  const { id, gramsPerDose } = await request.json();

  if (!id || typeof gramsPerDose !== "number" || gramsPerDose <= 0) {
    return NextResponse.json(
      { error: "Invalid id or gramsPerDose" },
      { status: 400 }
    );
  }

  const rows = await sql`
    UPDATE dose_types 
    SET grams_per_dose = ${gramsPerDose} 
    WHERE id = ${id}
    RETURNING *
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Dose type not found" }, { status: 404 });
  }

  const dt = rows[0];
  return NextResponse.json({
    id: dt.id,
    name: dt.name,
    gramsPerDose: dt.grams_per_dose,
    prefix: dt.prefix,
  });
}
