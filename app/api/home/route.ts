import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cellarId = searchParams.get('cellarId');

  if (!cellarId) {
    return NextResponse.json({ error: 'cellarId is required' }, { status: 400 });
  }

  try {
    // We cast to ::uuid to prevent the 500 error you saw in your logs
    const { rows } = await sql`
      SELECT * FROM brew_logs 
      WHERE cellar_id = ${cellarId}::uuid 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Home API Error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}