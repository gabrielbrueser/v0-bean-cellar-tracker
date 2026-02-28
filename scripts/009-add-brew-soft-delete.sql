-- Add soft delete support to brew_logs
ALTER TABLE brew_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_brew_logs_deleted_at ON brew_logs (deleted_at) WHERE deleted_at IS NULL;
