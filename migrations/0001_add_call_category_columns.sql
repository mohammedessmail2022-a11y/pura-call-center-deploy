-- Add callCategory and callSubCategory to calls table (run this on your Render PostgreSQL database if columns are missing)
ALTER TABLE calls ADD COLUMN IF NOT EXISTS "callCategory" text;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS "callSubCategory" text;
