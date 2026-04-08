
-- Move extensions from public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the pg_trgm extension if it exists in public
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER EXTENSION pgcrypto SET SCHEMA extensions;
  END IF;
END $$;
