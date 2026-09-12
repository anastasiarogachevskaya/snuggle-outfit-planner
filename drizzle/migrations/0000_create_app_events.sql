CREATE TABLE public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  user_id uuid,
  session_id text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  platform text NOT NULL DEFAULT 'web',
  CONSTRAINT app_events_name_known CHECK (name IN (
    'landing_viewed',
    'landing_try_clicked',
    'landing_signin_clicked',
    'try_age_selected',
    'try_location_set',
    'try_recommendation_viewed',
    'try_feedback_submitted',
    'try_create_account_clicked',
    'auth_signin_attempt',
    'auth_signup_attempt',
    'auth_cancelled',
    'auth_failed',
    'auth_succeeded',
    'wardrobe_chooser_viewed',
    'wardrobe_mode_chosen',
    'wardrobe_step_viewed',
    'wardrobe_saved',
    'today_viewed',
    'today_feedback_submitted'
  )),
  CONSTRAINT app_events_platform_known CHECK (platform IN ('web', 'ios')),
  CONSTRAINT app_events_props_small CHECK (length(props::text) <= 1000),
  CONSTRAINT app_events_session_short CHECK (session_id IS NULL OR length(session_id) <= 64)
);

CREATE INDEX app_events_created_at_idx ON public.app_events (created_at DESC);
CREATE INDEX app_events_name_created_at_idx ON public.app_events (name, created_at DESC);
CREATE INDEX app_events_session_idx ON public.app_events (session_id);

GRANT INSERT ON public.app_events TO anon;
GRANT INSERT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can record an event"
  ON public.app_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);