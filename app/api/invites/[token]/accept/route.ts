import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/invites/:token/accept - Accept an invite
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const sql = getDb();
  const userId = session.user.id;
  const userEmail = session.user.email?.toLowerCase();

  // Find the invite
  const inviteRows = await sql`
    SELECT ci.*, c.name as cellar_name
    FROM cellar_invites ci
    JOIN cellars c ON c.id = ci.cellar_id
    WHERE ci.token = ${token} 
      AND ci.accepted_at IS NULL 
      AND ci.expires_at > NOW()
  `;

  if (inviteRows.length === 0) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  const invite = inviteRows[0];

  // Check if invite email matches user email
  if (invite.email !== userEmail) {
    return NextResponse.json({ error: "This invite is for a different email address" }, { status: 403 });
  }

  // Check if already a member
  const existingMember = await sql`
    SELECT id FROM cellar_members 
    WHERE cellar_id = ${invite.cellar_id} AND user_id = ${userId}
  `;

  if (existingMember.length > 0) {
    return NextResponse.json({ error: "Already a member of this cellar" }, { status: 400 });
  }

  // Add user to cellar
  await sql`
    INSERT INTO cellar_members (cellar_id, user_id, role)
    VALUES (${invite.cellar_id}, ${userId}, ${invite.role})
  `;

  // Mark invite as accepted
  await sql`
    UPDATE cellar_invites 
    SET accepted_at = NOW() 
    WHERE id = ${invite.id}
  `;

  return NextResponse.json({
    cellarId: invite.cellar_id,
    cellarName: invite.cellar_name,
    role: invite.role,
  });
}
