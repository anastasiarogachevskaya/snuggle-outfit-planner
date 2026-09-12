ALTER TABLE public.app_events
  DROP CONSTRAINT app_events_user_id_fkey;

ALTER TABLE public.app_events
  ADD CONSTRAINT app_events_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;