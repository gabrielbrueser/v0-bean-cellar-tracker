const { neon } = require("@neondatabase/serverless");

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log("Creating cellars table...");
  await sql`
    CREATE TABLE IF NOT EXISTS cellars (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      created_by_user_id UUID REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  
  console.log("Creating cellar_members table...");
  await sql`
    CREATE TABLE IF NOT EXISTS cellar_members (
      cellar_id UUID REFERENCES cellars(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (cellar_id, user_id)
    )
  `;
  
  console.log("Creating cellar_invites table...");
  await sql`
    CREATE TABLE IF NOT EXISTS cellar_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cellar_id UUID REFERENCES cellars(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      invite_code VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  
  console.log("Adding cellar_id to existing tables...");
  
  // Add cellar_id to coffees
  await sql`
    ALTER TABLE coffees
    ADD COLUMN IF NOT EXISTS cellar_id UUID REFERENCES cellars(id) ON DELETE CASCADE
  `;
  
  // Add cellar_id to vials
  await sql`
    ALTER TABLE vials
    ADD COLUMN IF NOT EXISTS cellar_id UUID REFERENCES cellars(id) ON DELETE CASCADE
  `;
  
  // Add current_cellar_id to users
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS current_cellar_id UUID REFERENCES cellars(id)
  `;
  
  console.log("Creating indexes...");
  await sql`CREATE INDEX IF NOT EXISTS idx_coffees_cellar ON coffees(cellar_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vials_cellar ON vials(cellar_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cellar_members_user ON cellar_members(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_cellar_invites_code ON cellar_invites(invite_code)`;
  
  console.log("Migration complete!");
}

migrate().catch(console.error);
