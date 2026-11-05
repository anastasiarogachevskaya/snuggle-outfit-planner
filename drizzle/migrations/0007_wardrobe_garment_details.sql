ALTER TABLE public.wardrobe_items
  ADD COLUMN IF NOT EXISTS insulation text NOT NULL DEFAULT 'unknown'
    CHECK (insulation IN ('unknown','uninsulated','light','insulated')),
  ADD COLUMN IF NOT EXISTS waterproof text NOT NULL DEFAULT 'unknown'
    CHECK (waterproof IN ('unknown','yes','no')),
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available','temporarily_unavailable','outgrown')),
  ADD COLUMN IF NOT EXISTS sleepwear_shape text NOT NULL DEFAULT 'unknown'
    CHECK (sleepwear_shape IN ('unknown','one_piece','two_piece')),
  ADD COLUMN IF NOT EXISTS foot_coverage text NOT NULL DEFAULT 'unknown'
    CHECK (foot_coverage IN ('unknown','footed','footless')),
  ADD COLUMN IF NOT EXISTS leggings_use text NOT NULL DEFAULT 'unknown'
    CHECK (leggings_use IN ('unknown','thermal_base','standalone')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
COMMENT ON TABLE public.wardrobe_items IS 'One row per child and wardrobe slug (UNIQUE baby_id, slug). Garment details are optional; unknown means not stated by the parent and must not be inferred from the slug.';