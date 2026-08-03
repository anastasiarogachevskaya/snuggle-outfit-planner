import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { toast } from "sonner";
import { TodayScreen, type FeedbackContext } from "@/components/today-screen";
import { clearGuestProfile, readGuestProfile, GUEST_DEFAULT_WARDROBE } from "@/lib/guest-profile";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today's outfit — Layerly" },
      {
        name: "description",
        content:
          "See today's recommended baby outfit based on the local weather, your activity, and the clothes you own.",
      },
      { property: "og:title", content: "Today's outfit — Layerly" },
      { property: "og:url", content: "https://layerly.online/today" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/today" }],
  }),
  component: TodayPage,
});

function TodayPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const babyQ = useQuery({
    queryKey: ["baby"],
    queryFn: async () => {
      const { data, error } = await supabase.from("babies").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const wardrobeQ = useQuery({
    queryKey: ["wardrobe", babyQ.data?.id],
    enabled: !!babyQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wardrobe_items")
        .select("slug,owned")
        .eq("baby_id", babyQ.data!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Convert a guest trial into a real saved profile once the parent signs up.
  const seeded = useRef(false);
  const seed = useMutation({
    mutationFn: async () => {
      const guest = readGuestProfile();
      if (!guest) return false;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data: baby, error } = await supabase
        .from("babies")
        .insert({
          user_id: auth.user.id,
          name: guest.name || "Baby",
          dob: guest.dob,
          temperature_pref: guest.temperaturePref,
          latitude: guest.latitude,
          longitude: guest.longitude,
          location_label: guest.locationLabel,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: wErr } = await supabase.from("wardrobe_items").insert(
        GUEST_DEFAULT_WARDROBE.map((slug) => ({ baby_id: baby.id, slug, owned: true })),
      );
      if (wErr) throw wErr;
      clearGuestProfile();
      return true;
    },
    onSuccess: (created) => {
      if (created) {
        qc.invalidateQueries({ queryKey: ["baby"] });
        toast.success("Your trial profile has been saved.");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Couldn't save your profile"),
  });

  useEffect(() => {
    if (seeded.current) return;
    if (babyQ.isLoading || babyQ.data) return;
    if (!readGuestProfile()) return;
    seeded.current = true;
    seed.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [babyQ.isLoading, babyQ.data]);

  const owned = useMemo(
    () =>
      new Set<WardrobeSlug>(
        (wardrobeQ.data ?? []).filter((i) => i.owned).map((i) => i.slug as WardrobeSlug),
      ),
    [wardrobeQ.data],
  );

  const [confirmation, setConfirmation] = useState<null | "cold" | "comfortable" | "warm">(null);

  const feedback = useMutation({
    mutationFn: async ({
      rating,
      ctx,
    }: {
      rating: "comfortable" | "cold" | "warm";
      ctx: FeedbackContext | null;
    }) => {
      if (!babyQ.data || !ctx) return;
      const { error } = await supabase.from("feedback").insert({
        baby_id: babyQ.data.id,
        situation: ctx.situation,
        activity: ctx.situation,
        home_activity: ctx.situation === "home" ? ctx.homeActivity : null,
        transport_mode: ctx.situation === "walk" ? ctx.transportMode : null,
        duration_min: ctx.situation === "home" ? null : ctx.duration,
        room_temp_c: ctx.situation === "home" ? ctx.roomTemp : null,
        temp_c: ctx.weather.tempC,
        feels_like_c: ctx.weather.feelsLikeC,
        weather_condition: ctx.weather.condition,
        uv_index: ctx.weather.uvIndex ?? null,
        wind_kph: ctx.weather.windKph,
        baby_age_months: ctx.ageMonths,
        temperature_pref: babyQ.data.temperature_pref,
        recommendation: ctx.rec as any,
        recommended_clothing: [
          ...ctx.rec.babyClothing,
          ...ctx.rec.accessories,
          ...ctx.rec.sleepAccessories,
        ] as any,
        recommended_transport_extras: ctx.rec.transportExtras as any,
        feedback_details: null,
        rating,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      setConfirmation(vars.rating);
      setTimeout(() => setConfirmation((c) => (c === vars.rating ? null : c)), 4000);
    },
    onError: (e: any) => toast.error(e.message ?? "Couldn't save"),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (babyQ.isLoading || seed.isPending) return <Loading />;
  if (!babyQ.data) return <NoBaby />;
  const baby = babyQ.data;

  return (
    <TodayScreen
      baby={baby}
      owned={owned}
      feedbackPending={feedback.isPending}
      confirmation={confirmation}
      onFeedback={(rating, ctx) => feedback.mutate({ rating, ctx })}
      onOpenProfile={() => navigate({ to: "/baby" })}
      onOpenWardrobe={() => navigate({ to: "/wardrobe" })}
      secondaryAction={{ label: "Sign out", onClick: signOut }}
    />
  );
}

function Loading() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-canvas flex items-center justify-center">
      <p className="text-ink/40 text-sm">Loading…</p>
    </div>
  );
}

function NoBaby() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-canvas font-sans">
      <div className="mx-auto w-full max-w-md px-6 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-primary/70 mb-2">
          One quick step
        </p>
        <h1 className="text-3xl font-serif font-semibold mb-4">Tell us about your baby.</h1>
        <p className="text-ink/60 mb-8">
          Name, birthday, temperature preference, and where you are — that's it.
        </p>
        <Link
          to="/baby"
          className="inline-block rounded-2xl bg-primary text-primary-foreground px-6 py-3 font-medium shadow-md shadow-primary/20"
        >
          Set up profile
        </Link>
      </div>
    </div>
  );
}
