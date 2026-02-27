import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Create users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("Created users table");

  // Create allowed_users table (email allowlist)
  await sql`
    CREATE TABLE IF NOT EXISTS allowed_users (
      email TEXT PRIMARY KEY
    )
  `;
  console.log("Created allowed_users table");

  // Seed with allowed emails - UPDATE THESE WITH YOUR ACTUAL EMAILS
  await sql`
    INSERT INTO allowed_users (email) VALUES 
      ('user1@example.com'),
      ('user2@example.com')
    ON CONFLICT (email) DO NOTHING
  `;
  console.log("Seeded allowed_users with placeholder emails");
  console.log("IMPORTANT: Update allowed_users table with your actual emails!");

  // Optional: Add created_by_user_id to usage_logs for tracking who brewed
  await sql`
    ALTER TABLE usage_logs 
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id)
  `;
  console.log("Added created_by_user_id to usage_logs");

  console.log("Auth migration complete!");
}

main().catch(console.error);
