import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  // Add grams_per_dose column to fill_sessions for custom grammage per fill
  await sql`
    ALTER TABLE fill_sessions 
    ADD COLUMN IF NOT EXISTS grams_per_dose INTEGER
  `;

  console.log("Migration 002 completed: Added grams_per_dose to fill_sessions");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
