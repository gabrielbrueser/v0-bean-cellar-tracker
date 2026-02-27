-- Bean Cellar Tracker - Neon Postgres Schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Dose types (Espresso 18g, Filter 12g)
CREATE TABLE IF NOT EXISTS dose_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  grams_per_dose INTEGER NOT NULL,
  prefix TEXT NOT NULL UNIQUE
);

-- Counters for auto-incrementing vial codes per prefix
CREATE TABLE IF NOT EXISTS counters (
  prefix TEXT PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1
);

-- Process methods (Washed, Natural, etc.)
CREATE TABLE IF NOT EXISTS process_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coffees
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
);

-- Vials
CREATE TABLE IF NOT EXISTS vials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vial_code TEXT NOT NULL UNIQUE,
  dose_type_id UUID NOT NULL REFERENCES dose_types(id),
  qr_value TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'EMPTY' CHECK (status IN ('FULL', 'EMPTY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fill sessions
CREATE TABLE IF NOT EXISTS fill_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vial_id UUID NOT NULL REFERENCES vials(id),
  coffee_id UUID NOT NULL REFERENCES coffees(id),
  dose_type_id UUID NOT NULL REFERENCES dose_types(id),
  roast_date DATE NOT NULL,
  filled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'FULL' CHECK (status IN ('FULL', 'USED', 'ARCHIVED'))
);

-- Usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fill_session_id UUID NOT NULL REFERENCES fill_sessions(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brew_method TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fill_sessions_vial_id ON fill_sessions(vial_id);
CREATE INDEX IF NOT EXISTS idx_fill_sessions_status ON fill_sessions(status);
CREATE INDEX IF NOT EXISTS idx_fill_sessions_coffee_id ON fill_sessions(coffee_id);
CREATE INDEX IF NOT EXISTS idx_vials_status ON vials(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_fill_session ON usage_logs(fill_session_id);

-- Seed dose types
INSERT INTO dose_types (name, grams_per_dose, prefix) VALUES
  ('Espresso', 18, 'ESP'),
  ('Filter', 12, 'FLT')
ON CONFLICT (name) DO NOTHING;

-- Seed counters
INSERT INTO counters (prefix, next_number) VALUES
  ('ESP', 1),
  ('FLT', 1)
ON CONFLICT (prefix) DO NOTHING;

-- Seed default process methods
INSERT INTO process_methods (name, is_custom) VALUES
  ('Washed', false),
  ('Natural', false),
  ('Honey', false),
  ('Anaerobic', false),
  ('Carbonic Maceration', false),
  ('Wet Hulled', false),
  ('Double Washed', false),
  ('Extended Fermentation', false)
ON CONFLICT (name) DO NOTHING;
