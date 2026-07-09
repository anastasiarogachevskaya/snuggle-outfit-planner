
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- babies
CREATE TABLE public.babies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  temperature_pref INT NOT NULL DEFAULT 3 CHECK (temperature_pref BETWEEN 1 AND 5),
  location_label TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.babies TO authenticated;
GRANT ALL ON public.babies TO service_role;
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own babies all" ON public.babies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- wardrobe_items
CREATE TABLE public.wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  owned BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (baby_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wardrobe_items TO authenticated;
GRANT ALL ON public.wardrobe_items TO service_role;
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wardrobe all" ON public.wardrobe_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babies b WHERE b.id = baby_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.babies b WHERE b.id = baby_id AND b.user_id = auth.uid()));

-- feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES public.babies(id) ON DELETE CASCADE,
  situation TEXT NOT NULL,
  temp_c DOUBLE PRECISION,
  feels_like_c DOUBLE PRECISION,
  recommendation JSONB,
  rating TEXT NOT NULL CHECK (rating IN ('comfortable','cold','warm')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback all" ON public.feedback FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.babies b WHERE b.id = baby_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.babies b WHERE b.id = baby_id AND b.user_id = auth.uid()));
