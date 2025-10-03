-- Ensure required extensions are available
-- This migration runs first to set up UUID generation

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable uuid-ossp for compatibility (some existing migrations may reference it)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify gen_random_uuid() works
DO $$
BEGIN
  PERFORM gen_random_uuid();
  RAISE NOTICE 'UUID generation verified: gen_random_uuid() is available';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'UUID generation failed. Please ensure pgcrypto extension is enabled.';
END $$;

