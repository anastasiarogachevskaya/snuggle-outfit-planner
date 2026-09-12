-- 0002 installed pg_cron and set the FK to SET NULL so anonymized events
-- survive account deletion, but never actually scheduled the daily cleanup
-- the privacy policy and account-deletion dialog promise ("automatically
-- deleted after 90 days"). This adds that job.
SELECT cron.schedule(
  'app_events_retention_cleanup',
  '0 3 * * *',
  $$ DELETE FROM public.app_events WHERE created_at < now() - interval '90 days' $$
);
