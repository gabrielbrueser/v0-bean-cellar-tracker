import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

// GET /api/cellars/:id/invites - Get pending invites for a cellar
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cellarId } = await params;
  const sql = getDb();
  const userId = session.user.id;

  // Check if user is owner or admin
  const memberCheck = await sql`
    SELECT role FROM cellar_members 
    WHERE cellar_id = ${cellarId} AND user_id = ${userId}
  `;

  if (memberCheck.length === 0 || !["owner", "admin"].includes(memberCheck[0].role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await sql`
    SELECT id, email, role, created_at, expires_at
    FROM cellar_invites
    WHERE cellar_id = ${cellarId} AND accepted_at IS NULL AND expires_at > NOW()
    ORDER BY created_at DESC
  `;

  return NextResponse.json(rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  })));
}

// POST /api/cellars/:id/invites - Create an invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cellarId } = await params;
  const body = await req.json();
  const { email, role = "member" } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const sql = getDb();
  const userId = session.user.id;

  // Check if user is owner or admin
  const memberCheck = await sql`
    SELECT role FROM cellar_members 
    WHERE cellar_id = ${cellarId} AND user_id = ${userId}
  `;

  if (memberCheck.length === 0 || !["owner", "admin"].includes(memberCheck[0].role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if email is already a member
  const existingMember = await sql`
    SELECT cm.id FROM cellar_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.cellar_id = ${cellarId} AND u.email = ${email.toLowerCase()}
  `;

  if (existingMember.length > 0) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  // Generate invite token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const rows = await sql`
    INSERT INTO cellar_invites (cellar_id, email, role, token, invited_by_user_id, expires_at)
    VALUES (${cellarId}, ${email.toLowerCase()}, ${role}, ${token}, ${userId}, ${expiresAt})
    RETURNING id, email, role, created_at, expires_at
  `;

  return NextResponse.json({
    id: rows[0].id,
    email: rows[0].email,
    role: rows[0].role,
    token,
    createdAt: rows[0].created_at,
    expiresAt: rows[0].expires_at,
  });
}
