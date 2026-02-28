import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Normalize and parse QR payload to extract vial code or UUID.
 * Accepts multiple formats:
 * - ESP-003, FLT-012 (plain label)
 * - bc:ESP-003 (our preferred format)
 * - dose:ESP-003 (alternative prefix)
 * - bean-cellar://dose/ESP-003 (deep link)
 * - https://domain.com/dose/ESP-003 or /doses/ESP-003 (URL)
 * - ?code=ESP-003 (query param)
 * - UUID format (internal id lookup)
 */
function parseQRPayload(rawValue: string): { type: "code" | "uuid"; value: string } | null {
  const value = rawValue.trim();
  
  if (!value) return null;
  
  // Check if it's a UUID (36 chars with dashes)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(value)) {
    return { type: "uuid", value: value.toLowerCase() };
  }
  
  let code: string | null = null;
  
  // Format: bc:CODE
  if (value.toLowerCase().startsWith("bc:")) {
    code = value.substring(3);
  }
  // Format: dose:CODE
  else if (value.toLowerCase().startsWith("dose:")) {
    code = value.substring(5);
  }
  // Format: bean-cellar://dose/CODE
  else if (value.toLowerCase().startsWith("bean-cellar://dose/")) {
    code = value.substring(19);
  }
  // Format: URL with /dose/, /doses/, /vials/, or /vials/code/ path
  else if (value.includes("/")) {
    // Try URL parsing
    try {
      const url = new URL(value, "https://placeholder.com");
      // Check query param: ?code=ESP-003
      const queryCode = url.searchParams.get("code");
      if (queryCode) {
        code = queryCode;
      } else {
        // Extract last path segment: /dose/ESP-003, /doses/ESP-003, /vials/ESP-003, /vials/code/ESP-003
        const pathMatch = url.pathname.match(/\/(?:dose|doses|vials)(?:\/code)?\/([A-Z]{2,3}-\d{3})/i);
        if (pathMatch) {
          code = pathMatch[1];
        }
      }
    } catch {
      // Not a valid URL, try regex on raw string
      const pathMatch = value.match(/\/(?:dose|doses|vials)(?:\/code)?\/([A-Z]{2,3}-\d{3})/i);
      if (pathMatch) {
        code = pathMatch[1];
      }
    }
  }
  // Format: Plain vial code (ESP-001, FLT-001, etc.)
  else {
    const codeMatch = value.match(/^([A-Z]{2,3}-\d{3})$/i);
    if (codeMatch) {
      code = codeMatch[1];
    }
  }
  
  // Validate and normalize the code
  if (code) {
    code = code.toUpperCase().trim();
    // Validate format: 2-3 uppercase letters + hyphen + 3 digits
    if (/^[A-Z]{2,3}-\d{3}$/.test(code)) {
      return { type: "code", value: code };
    }
  }
  
  return null;
}

// GET /api/vials/lookup?qr=bc:ESP-001
// Supports multiple QR formats - see parseQRPayload function
export async function GET(req: NextRequest) {
  const qr = req.nextUrl.searchParams.get("qr");
  if (!qr) {
    return NextResponse.json(null);
  }

  const sql = getDb();
  const parsed = parseQRPayload(qr);
  
  if (!parsed) {
    // Could not parse the QR value
    return NextResponse.json(null);
  }

  let rows;
  
  if (parsed.type === "uuid") {
    // Look up by internal UUID
    rows = await sql`SELECT * FROM vials WHERE id = ${parsed.value}`;
  } else {
    // Look up by vial code
    const vialCode = parsed.value;
    rows = await sql`SELECT * FROM vials WHERE vial_code = ${vialCode}`;
    
    // Fallback: try exact qr_value match (backward compatibility)
    if (rows.length === 0) {
      const bcFormat = `bc:${vialCode}`;
      rows = await sql`SELECT * FROM vials WHERE qr_value = ${bcFormat}`;
    }
    
    // Fallback: try the raw input as qr_value
    if (rows.length === 0) {
      rows = await sql`SELECT * FROM vials WHERE qr_value = ${qr}`;
    }
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
