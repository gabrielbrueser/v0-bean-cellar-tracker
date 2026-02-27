import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/vials/lookup?qr=bc:ESP-001
// Supports multiple QR formats:
// - bc:ESP-001 (stored qr_value format)
// - vial:ESP-001 (alternative prefix)
// - ESP-001 (plain code)
// - Full URLs containing the vial code
export async function GET(req: NextRequest) {
  const qr = req.nextUrl.searchParams.get("qr");
  if (!qr) {
    return NextResponse.json(null);
  }

  const sql = getDb();

  // Extract vial code from various formats
  let vialCode: string | null = null;

  // Format: bc:CODE
  if (qr.startsWith("bc:")) {
    vialCode = qr.substring(3).toUpperCase();
  }
  // Format: vial:CODE
  else if (qr.startsWith("vial:")) {
    vialCode = qr.substring(5).toUpperCase();
  }
  // Format: URL containing vial code
  else if (qr.includes("/vials/")) {
    const match = qr.match(/\/vials\/(?:code\/)?([A-Z]{2,3}-\d{3})/i);
    if (match) {
      vialCode = match[1].toUpperCase();
    }
  }
  // Format: Plain code (ESP-001, FLT-001)
  else {
    const match = qr.match(/^([A-Z]{2,3}-\d{3})$/i);
    if (match) {
      vialCode = match[1].toUpperCase();
    }
  }

  // First try looking up by the exact qr_value (for backward compatibility)
  let rows = await sql`SELECT * FROM vials WHERE qr_value = ${qr}`;

  // If not found and we extracted a vial code, try looking up by vial_code
  if (rows.length === 0 && vialCode) {
    rows = await sql`SELECT * FROM vials WHERE vial_code = ${vialCode}`;
  }

  // Also try the bc: format if we have a vial code
  if (rows.length === 0 && vialCode) {
    const bcFormat = `bc:${vialCode}`;
    rows = await sql`SELECT * FROM vials WHERE qr_value = ${bcFormat}`;
  }

  if (rows.length === 0) {
    return NextResponse.json(null);
  }

  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    vialCode: r.vial_code,
    doseTypeId: r.dose_type_id,
    qrValue: r.qr_value,
    createdAt: r.created_at,
    status: r.status,
  });
}
