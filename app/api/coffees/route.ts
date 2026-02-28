import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cellarId = searchParams.get('cellarId');

  if (!cellarId) {
    return NextResponse.json({ error: 'cellarId is required' }, { status: 400 });
  }

  try {
    const { rows } = await sql`
      SELECT * FROM coffees 
      WHERE cellar_id = ${cellarId}::uuid 
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}