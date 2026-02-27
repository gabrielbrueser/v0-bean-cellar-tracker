import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  // Enable UUID generation
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  // Dose types
  await sql`
    CREATE TABLE IF NOT EXISTS dose_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      grams_per_dose INTEGER NOT NULL,
      prefix TEXT NOT NULL UNIQUE
    )
  `;

  // Counters for auto-incrementing vial codes per prefix
  await sql`
    CREATE TABLE IF NOT EXISTS counters (
      prefix TEXT PRIMARY KEY,
      next_number INTEGER NOT NULL DEFAULT 1
    )
  `;

  // Process methods
  await sql`
    CREATE TABLE IF NOT EXISTS process_methods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      is_custom BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Coffees
  await sql`
    CREATE TABLE IF NOT EXISTS coffees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      roaster TEXT NOT NULL DEFAULT 'Tanat',
      coffee_name TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      origin TEXT NOT NULL,
      producer TEXT DEFAULT '',
      variety TEXT DEFAULT '',
      altitude TEXT DEFAULT '',
      tasting_notes TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      link TEXT DEFAULT '',
      process_method_id UUID REFERENCES process_methods(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Vials
  await sql`
    CREATE TABLE IF NOT EXISTS vials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vial_code TEXT NOT NULL UNIQUE,
      dose_type_id UUID NOT NULL REFERENCES dose_types(id),
      qr_value TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'EMPTY' CHECK (status IN ('FULL', 'EMPTY')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Fill sessions
  await sql`
    CREATE TABLE IF NOT EXISTS fill_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vial_id UUID NOT NULL REFERENCES vials(id),
      coffee_id UUID NOT NULL REFERENCES coffees(id),
      dose_type_id UUID NOT NULL REFERENCES dose_types(id),
      roast_date DATE NOT NULL,
      filled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'FULL' CHECK (status IN ('FULL', 'USED', 'ARCHIVED'))
    )
  `;

  // Usage logs
  await sql`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fill_session_id UUID NOT NULL REFERENCES fill_sessions(id),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      brew_method TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    )
  `;

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_fill_sessions_vial_id ON fill_sessions(vial_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fill_sessions_status ON fill_sessions(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fill_sessions_coffee_id ON fill_sessions(coffee_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vials_status ON vials(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_usage_logs_fill_session ON usage_logs(fill_session_id)`;

  // Seed dose types
  await sql`
    INSERT INTO dose_types (name, grams_per_dose, prefix) VALUES
      ('Espresso', 18, 'ESP'),
      ('Filter', 12, 'FLT')
    ON CONFLICT (name) DO NOTHING
  `;

  // Seed counters
  await sql`
    INSERT INTO counters (prefix, next_number) VALUES
      ('ESP', 1),
      ('FLT', 1)
    ON CONFLICT (prefix) DO NOTHING
  `;

  // Seed default process methods
  await sql`
    INSERT INTO process_methods (name, is_custom) VALUES
      ('Washed', false),
      ('Natural', false),
      ('Honey', false),
      ('Anaerobic', false),
      ('Carbonic Maceration', false),
      ('Wet Hulled', false),
      ('Double Washed', false),
      ('Extended Fermentation', false)
    ON CONFLICT (name) DO NOTHING
  `;

  console.log("Migration completed successfully!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
