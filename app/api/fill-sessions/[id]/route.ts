import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// PATCH /api/fill-sessions/:id - Update a fill session (change coffee, dose type, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  
  try {
    const body = await req.json();
    const { coffeeId, doseTypeId, roastDate, gramsPerDose } = body;
    
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    
    if (coffeeId) {
      updates.push("coffee_id = $" + (values.length + 1));
      values.push(coffeeId);
    }
    
    if (doseTypeId) {
      updates.push("dose_type_id = $" + (values.length + 1));
      values.push(doseTypeId);
      
      // Also get the grams_per_dose from the dose type if not explicitly provided
      if (!gramsPerDose) {
        const doseType = await sql`SELECT grams_per_dose FROM dose_types WHERE id = ${doseTypeId}`;
        if (doseType.length > 0) {
          updates.push("grams_per_dose = $" + (values.length + 1));
          values.push(doseType[0].grams_per_dose);
        }
      }
    }
    
    if (roastDate) {
      updates.push("roast_date = $" + (values.length + 1));
      values.push(roastDate);
    }
    
    if (gramsPerDose !== undefined) {
      updates.push("grams_per_dose = $" + (values.length + 1));
      values.push(gramsPerDose);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    
    // Add the id as the last parameter
    values.push(id);
    
    // Execute the update
    const result = await sql.unsafe(
      `UPDATE fill_sessions SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    
    if (result.length === 0) {
      return NextResponse.json({ error: "Fill session not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      id: result[0].id,
      coffeeId: result[0].coffee_id,
      doseTypeId: result[0].dose_type_id,
      roastDate: result[0].roast_date,
      gramsPerDose: result[0].grams_per_dose,
    });
  } catch (error) {
    console.error("Error updating fill session:", error);
    return NextResponse.json(
      { error: "Failed to update fill session" },
      { status: 500 }
    );
  }
}
