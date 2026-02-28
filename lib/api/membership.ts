import { NextResponse } from "next/server";
import type { NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Verify user has membership in the specified cellar.
 * Throws a 403 response if user is not a member.
 */
export async function requireCellarMembership(
  sql: NeonQueryFunction<false, false>,
  userId: string,
  cellarId: string
): Promise<void> {
  const rows = await sql`
    SELECT id FROM cellar_members
    WHERE user_id = ${userId} AND cellar_id = ${cellarId}
    LIMIT 1
  `;
  
  if (rows.length === 0) {
    throw NextResponse.json(
      { error: "Forbidden: not a member of this cellar" },
      { status: 403 }
    );
  }
}

/**
 * Check if user has membership in the specified cellar.
 * Returns true/false without throwing.
 */
export async function checkCellarMembership(
  sql: NeonQueryFunction<false, false>,
  userId: string,
  cellarId: string
): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM cellar_members
    WHERE user_id = ${userId} AND cellar_id = ${cellarId}
    LIMIT 1
  `;
  
  return rows.length > 0;
}
