import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Creating coffee_photos table...");

  await sql`
    CREATE TABLE IF NOT EXISTS coffee_photos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      coffee_id UUID NOT NULL REFERENCES coffees(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      caption TEXT,
      photo_type TEXT DEFAULT 'general',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_coffee_photos_coffee_id ON coffee_photos(coffee_id)`;

  console.log("Migration complete!");
}

migrate().catch(console.error);
