-- Links orders to the account that placed them ("My Orders") and stores
-- customer font references for custom namesets. Additive and safe to re-run.
--
-- Apply with:  psql "$DATABASE_URL" -f drizzle/manual/2026-10-27_user_orders_and_font_uploads.sql
-- Run it as the app's own role (the user in DATABASE_URL). If a superuser runs it,
-- hand the new table to the app role afterwards, e.g. on the VPS:
--   ALTER TABLE customization_uploads OWNER TO cfjersey;
-- otherwise every font upload fails with "The file could not be saved."
BEGIN;

ALTER TABLE order_requests ADD COLUMN IF NOT EXISTS user_open_id varchar(64);
CREATE INDEX IF NOT EXISTS order_requests_user_open_id_idx ON order_requests (user_open_id);

CREATE TABLE IF NOT EXISTS customization_uploads (
  id varchar(32) PRIMARY KEY,
  file_name varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes integer NOT NULL,
  data text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
