import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/cellars - Get all cellars the user is a member of
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const userId = session.user.id;

  const rows = await sql`
    SELECT 
      c.id,
      c.name,
      c.created_at,
      cm.role,
      (SELECT COUNT(*) FROM cellar_members WHERE cellar_id = c.id) as member_count
    FROM cellars c
    JOIN cellar_members cm ON cm.cellar_id = c.id
    WHERE cm.user_id = ${userId}
    ORDER BY c.name
  `;

  const cellars = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    memberCount: Number(r.member_count),
    createdAt: r.created_at,
  }));

  return NextResponse.json(cellars);
}

// POST /api/cellars - Create a new cellar
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const sql = getDb();
  const userId = session.user.id;

  // Create cellar
  const cellarRows = await sql`
    INSERT INTO cellars (name, created_by_user_id)
    VALUES (${name.trim()}, ${userId})
    RETURNING *
  `;

  const cellar = cellarRows[0];

  // Add creator as owner
  await sql`
    INSERT INTO cellar_members (cellar_id, user_id, role)
    VALUES (${cellar.id}, ${userId}, 'owner')
  `;

  return NextResponse.json({
    id: cellar.id,
    name: cellar.name,
    role: "owner",
    memberCount: 1,
    createdAt: cellar.created_at,
  });
}
