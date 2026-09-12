-- Scope inserted user_id to the caller's own identity. The previous
-- "WITH CHECK (true)" let any authenticated caller post events attributing
-- them to an arbitrary user_id by hitting the REST endpoint directly.
DROP POLICY "anyone can record an event" ON public.app_events;

CREATE POLICY "anyone can record an event"
  ON public.app_events FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
