-- Add soft delete support to coffees table
ALTER TABLE coffees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_coffees_deleted_at ON coffees(deleted_at) WHERE deleted_at IS NULL;
