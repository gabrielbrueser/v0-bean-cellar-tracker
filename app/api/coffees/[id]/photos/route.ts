import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { del } from "@vercel/blob";

// GET /api/coffees/:id/photos
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: coffeeId } = await params;
  const sql = getDb();

  const rows = await sql`
    SELECT * FROM coffee_photos 
    WHERE coffee_id = ${coffeeId} 
    ORDER BY created_at DESC
  `;

  const photos = rows.map((r) => ({
    id: r.id,
    coffeeId: r.coffee_id,
    url: r.url,
    caption: r.caption,
    photoType: r.photo_type,
    createdAt: r.created_at,
  }));

  return NextResponse.json(photos);
}

// POST /api/coffees/:id/photos
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: coffeeId } = await params;
  const { url, caption, photoType } = await req.json();
  const sql = getDb();

  const rows = await sql`
    INSERT INTO coffee_photos (coffee_id, url, caption, photo_type)
    VALUES (${coffeeId}, ${url}, ${caption || null}, ${photoType || "other"})
    RETURNING *
  `;

  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    coffeeId: r.coffee_id,
    url: r.url,
    caption: r.caption,
    photoType: r.photo_type,
    createdAt: r.created_at,
  });
}

// DELETE /api/coffees/:id/photos
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: coffeeId } = await params;
  const { photoId, url } = await req.json();
  const sql = getDb();

  // Delete from database
  await sql`
    DELETE FROM coffee_photos 
    WHERE id = ${photoId} AND coffee_id = ${coffeeId}
  `;

  // Try to delete from Blob storage
  try {
    await del(url);
  } catch (e) {
    console.error("Failed to delete blob:", e);
  }

  return NextResponse.json({ success: true });
}
