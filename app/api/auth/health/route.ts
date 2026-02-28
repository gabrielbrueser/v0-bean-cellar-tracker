import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const missing: string[] = [];
  let dbOk = false;
  let authConfigured = false;

  // Check for AUTH_SECRET
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    missing.push("AUTH_SECRET or NEXTAUTH_SECRET");
  } else {
    authConfigured = true;
  }

  // Check for base URL (optional but recommended)
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    // Not critical since trustHost: true handles this
    console.log("[Auth Health] AUTH_URL not set, using request host");
  }

  // Check database connection
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    dbOk = true;
  } catch (error) {
    console.error("[Auth Health] Database connection failed:", error);
    dbOk = false;
  }

  const ok = missing.length === 0 && dbOk && authConfigured;

  return NextResponse.json({
    ok,
    authConfigured,
    db: dbOk,
    missing: missing.length > 0 ? missing : undefined,
    baseUrl: baseUrl ? "set" : "not set (using trustHost)",
    timestamp: new Date().toISOString(),
  });
}
