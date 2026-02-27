import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/process-methods
export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM process_methods ORDER BY name ASC`;
  const methods = rows.map((r) => ({
    id: r.id,
    name: r.name,
    isCustom: r.is_custom,
    createdAt: r.created_at,
  }));
  return NextResponse.json(methods);
}

// POST /api/process-methods
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const sql = getDb();
  const rows = await sql`
    INSERT INTO process_methods (name, is_custom) VALUES (${name}, true) RETURNING *
  `;
  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    name: r.name,
    isCustom: r.is_custom,
    createdAt: r.created_at,
  });
}
