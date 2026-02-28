import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST /api/vials/:id/rename — rename a vial's display code
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cellarId = req.nextUrl.searchParams.get("cellarId");
  const sql = getDb();

  // REQUIRE cellarId
  if (!cellarId) {
    return NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }

  try {
    const { newCode } = await req.json();

    if (!newCode || typeof newCode !== "string") {
      return NextResponse.json({ error: "New code is required" }, { status: 400 });
    }

    const code = newCode.trim().toUpperCase();

    // Validate format (e.g., ESP-001, FLT-001)
    const codeMatch = code.match(/^([A-Z]{2,3})-(\d{3})$/);
    if (!codeMatch) {
      return NextResponse.json(
        { error: "Invalid format. Use format like ESP-001 or FLT-001" },
        { status: 400 }
      );
    }

    // Get the current vial and validate cellar ownership
    const currentVials = await sql`SELECT * FROM vials WHERE id = ${id} AND cellar_id = ${cellarId}`;
    if (currentVials.length === 0) {
      return NextResponse.json({ error: "Dose not found in this cellar" }, { status: 404 });
    }

    const currentVial = currentVials[0];
    const currentPrefix = currentVial.vial_code.split("-")[0];
    const newPrefix = codeMatch[1];

    // Ensure prefix doesn't change
    if (newPrefix !== currentPrefix) {
      return NextResponse.json(
        { error: `Cannot change prefix. Must start with ${currentPrefix}-` },
        { status: 400 }
      );
    }

    // Check if the new code is already in use by another vial in this cellar
    const existingVials = await sql`
      SELECT id FROM vials WHERE vial_code = ${code} AND id != ${id} AND cellar_id = ${cellarId}
    `;
    if (existingVials.length > 0) {
      return NextResponse.json(
        { error: `Code ${code} is already in use` },
        { status: 400 }
      );
    }

    // Update only the vial_code (display code)
    // Note: qr_value stays the same so existing QR labels still work
    await sql`UPDATE vials SET vial_code = ${code} WHERE id = ${id}`;

    return NextResponse.json({ success: true, newCode: code });
  } catch (error) {
    console.error("Failed to rename vial:", error);
    return NextResponse.json(
      { error: "Failed to rename vial" },
      { status: 500 }
    );
  }
}
