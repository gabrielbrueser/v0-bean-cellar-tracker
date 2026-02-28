import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/dose/freezeMany - bulk freeze doses
export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { doseIds, cellarId } = body;

  if (!Array.isArray(doseIds) || doseIds.length === 0) {
    return NextResponse.json(
      { error: "doseIds must be a non-empty array" },
      { status: 400 }
    );
  }

  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId is required" },
      { status: 400 }
    );
  }

  // Verify all doses exist, are sealed (FULL), and belong to the specified cellar
  const verifyRows = await sql`
    SELECT v.id, v.is_frozen, c.cellar_id
    FROM vials v
    JOIN fill_sessions fs ON fs.vial_id = v.id AND fs.status = 'FULL'
    JOIN coffees c ON c.id = fs.coffee_id
    WHERE v.id = ANY(${doseIds})
  `;

  const validDoseIds = verifyRows
    .filter(row => row.cellar_id === cellarId && !row.is_frozen)
    .map(row => row.id);

  if (validDoseIds.length === 0) {
    return NextResponse.json(
      { error: "No valid doses to freeze - they may already be frozen or not in this cellar" },
      { status: 400 }
    );
  }

  // Freeze all valid doses
  await sql`
    UPDATE vials
    SET is_frozen = true, frozen_at = NOW()
    WHERE id = ANY(${validDoseIds})
  `;

  return NextResponse.json({
    ok: true,
    frozenCount: validDoseIds.length,
    frozenIds: validDoseIds,
  });
}
