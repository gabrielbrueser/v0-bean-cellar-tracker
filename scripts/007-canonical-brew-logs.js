const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log("Creating canonical brew_logs table...");

  // Create the canonical brew_logs table
  await sql`
    CREATE TABLE IF NOT EXISTS brew_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      cellar_id UUID REFERENCES cellars(id),
      coffee_id UUID NOT NULL REFERENCES coffees(id),
      dose_id UUID NOT NULL REFERENCES vials(id),
      brew_method VARCHAR(20) NOT NULL CHECK (brew_method IN ('espresso', 'filter')),
      dose_grams DECIMAL(6,1) NOT NULL,
      grind_size INTEGER NOT NULL,
      grind_unit VARCHAR(20) NOT NULL CHECK (grind_unit IN ('espresso-scale', 'comandante-clicks')),
      extraction_grams DECIMAL(6,1) NOT NULL,
      brew_feedback VARCHAR(10) NOT NULL CHECK (brew_feedback IN ('fast', 'good', 'slow')),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log("brew_logs table created");

  // Add freezing fields to vials table
  await sql`
    ALTER TABLE vials 
    ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP WITH TIME ZONE
  `;
  console.log("Added is_frozen and frozen_at columns to vials");

  // Create index for performance
  await sql`CREATE INDEX IF NOT EXISTS idx_brew_logs_user ON brew_logs(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_brew_logs_cellar ON brew_logs(cellar_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_brew_logs_coffee ON brew_logs(coffee_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_brew_logs_created ON brew_logs(created_at DESC)`;
  console.log("Created indexes for brew_logs");

  // Migrate existing usage_logs to brew_logs
  console.log("Migrating existing usage_logs to brew_logs...");
  
  const existingLogs = await sql`
    SELECT 
      ul.id,
      ul.fill_session_id,
      ul.brew_method,
      ul.grind_size,
      ul.notes,
      ul.timestamp,
      ul.created_by_user_id,
      fs.coffee_id,
      fs.vial_id,
      fs.grams_per_dose,
      fs.cellar_id
    FROM usage_logs ul
    JOIN fill_sessions fs ON fs.id = ul.fill_session_id
  `;

  for (const log of existingLogs) {
    const brewMethod = log.brew_method || 'espresso';
    const grindUnit = brewMethod === 'espresso' ? 'espresso-scale' : 'comandante-clicks';
    const grindSize = log.grind_size || (brewMethod === 'espresso' ? 15 : 25);
    const doseGrams = log.grams_per_dose || 18;
    const extractionGrams = brewMethod === 'espresso' ? 36 : 250; // Default estimates
    
    await sql`
      INSERT INTO brew_logs (
        id, user_id, cellar_id, coffee_id, dose_id, brew_method,
        dose_grams, grind_size, grind_unit, extraction_grams, brew_feedback, notes, created_at
      ) VALUES (
        ${log.id}, ${log.created_by_user_id}, ${log.cellar_id}, ${log.coffee_id}, ${log.vial_id},
        ${brewMethod}, ${doseGrams}, ${grindSize}, ${grindUnit}, ${extractionGrams}, 'good', ${log.notes}, ${log.timestamp}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
  
  console.log(`Migrated ${existingLogs.length} usage logs to brew_logs`);
  console.log("Migration complete!");
}

migrate().catch(console.error);
