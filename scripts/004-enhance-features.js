import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  // Add grind_size to usage_logs for brew notes
  await sql`
    ALTER TABLE usage_logs 
    ADD COLUMN IF NOT EXISTS grind_size TEXT DEFAULT ''
  `;

  // Add color to coffees for visual identity
  await sql`
    ALTER TABLE coffees 
    ADD COLUMN IF NOT EXISTS color TEXT DEFAULT ''
  `;

  // Add archived status to coffees
  await sql`
    ALTER TABLE coffees 
    ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false
  `;

  // Add archived status to vials  
  await sql`
    ALTER TABLE vials 
    ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false
  `;

  // Add grams_per_dose to fill_sessions if not exists
  await sql`
    ALTER TABLE fill_sessions 
    ADD COLUMN IF NOT EXISTS grams_per_dose NUMERIC(5,1) DEFAULT 18
  `;

  // Create indexes for archived items
  await sql`CREATE INDEX IF NOT EXISTS idx_coffees_archived ON coffees(archived)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vials_archived ON vials(archived)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp)`;

  console.log("Enhancement migration completed successfully!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
