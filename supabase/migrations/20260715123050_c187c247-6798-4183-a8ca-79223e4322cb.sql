
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS baby_age_months integer,
  ADD COLUMN IF NOT EXISTS activity text,
  ADD COLUMN IF NOT EXISTS home_activity text,
  ADD COLUMN IF NOT EXISTS transport_mode text,
  ADD COLUMN IF NOT EXISTS duration_min integer,
  ADD COLUMN IF NOT EXISTS room_temp_c double precision,
  ADD COLUMN IF NOT EXISTS weather_condition text,
  ADD COLUMN IF NOT EXISTS uv_index double precision,
  ADD COLUMN IF NOT EXISTS wind_kph double precision,
  ADD COLUMN IF NOT EXISTS temperature_pref integer,
  ADD COLUMN IF NOT EXISTS recommended_clothing jsonb,
  ADD COLUMN IF NOT EXISTS recommended_transport_extras jsonb,
  ADD COLUMN IF NOT EXISTS feedback_details jsonb;
