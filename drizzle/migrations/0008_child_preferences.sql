ALTER TABLE public.babies
  ADD COLUMN IF NOT EXISTS clothing_style text NOT NULL DEFAULT 'both'
    CHECK (clothing_style IN ('bodysuits','tops','both')),
  ADD COLUMN IF NOT EXISTS nappy_use text NOT NULL DEFAULT 'unknown'
    CHECK (nappy_use IN ('yes','no','unknown')),
  ADD COLUMN IF NOT EXISTS easy_toilet_access boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.babies.nappy_use IS 'Stated by the parent only; never derived from age.';