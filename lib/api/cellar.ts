import { NextRequest, NextResponse } from "next/server";

/**
 * Extract and validate cellarId from request query params.
 * Throws a 400 response if cellarId is missing.
 */
export function requireCellarId(req: NextRequest): string {
  const { searchParams } = new URL(req.url);
  const cellarId = searchParams.get("cellarId");
  
  if (!cellarId || cellarId.trim() === "") {
    throw NextResponse.json(
      { error: "cellarId query param is required" },
      { status: 400 }
    );
  }
  
  return cellarId;
}

/**
 * Get cellarId from request, returns null if not present.
 * Use this for optional cellarId scenarios.
 */
export function getCellarId(req: NextRequest): string | null {
  const { searchParams } = new URL(req.url);
  return searchParams.get("cellarId");
}
