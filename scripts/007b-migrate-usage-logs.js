const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
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
      c.cellar_id
    FROM usage_logs ul
    JOIN fill_sessions fs ON fs.id = ul.fill_session_id
    LEFT JOIN coffees c ON c.id = fs.coffee_id
  `;

  let migrated = 0;
  for (const log of existingLogs) {
    const brewMethod = log.brew_method || 'espresso';
    const grindUnit = brewMethod === 'espresso' ? 'espresso-scale' : 'comandante-clicks';
    const grindSize = log.grind_size || (brewMethod === 'espresso' ? 15 : 25);
    const doseGrams = log.grams_per_dose || 18;
    const extractionGrams = brewMethod === 'espresso' ? 36 : 250;
    
    try {
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
      migrated++;
    } catch (err) {
      console.log(`Skipping log ${log.id}: ${err.message}`);
    }
  }
  
  console.log(`Migrated ${migrated} of ${existingLogs.length} usage logs to brew_logs`);
  console.log("Migration complete!");
}

migrate().catch(console.error);
