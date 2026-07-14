import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchWeather } from "@/lib/weather";
import { recommend, type Situation, type TransportMode, type HomeActivity } from "@/lib/recommend";
import { type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { toast } from "sonner";
import {
  HomeIcon,
  WalkIcon,
  walkIconVariants,
  CarIcon,
  carIconVariants,
  PlayingIcon,
  SleepingIcon,
  ClothingIcon,
  type IconProps,
} from "@/components/icons";
import type { ComponentType } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

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

function ageInMonths(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function isRainingCondition(condition: string | undefined) {
  if (!condition) return false;
  return /rain|drizzle|shower|thunder/i.test(condition);
}

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

  const weatherQ = useQuery({
    queryKey: ["weather", babyQ.data?.latitude, babyQ.data?.longitude],
    enabled: !!babyQ.data?.latitude && !!babyQ.data?.longitude,
    staleTime: 5 * 60_000,
    queryFn: () => fetchWeather(babyQ.data!.latitude!, babyQ.data!.longitude!),
  });

  const [situation, setSituation] = useState<Situation>("walk");
  const [roomTemp, setRoomTemp] = useState(21);
  const ageMonths = ageInMonths(babyQ.data?.dob);
  const pramAllowed = ageMonths === null || ageMonths <= 6;

  const [transportMode, setTransportMode] = useState<TransportMode>("sitting-stroller");
  useEffect(() => {
    if (!pramAllowed && transportMode === "pram") setTransportMode("sitting-stroller");
    if (ageMonths !== null && ageMonths < 4 && transportMode === "sitting-stroller") {
      setTransportMode("pram");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageMonths]);

  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [homeActivity, setHomeActivity] = useState<HomeActivity>("playing");

  const [walkIconIdx, setWalkIconIdx] = useLocalStorage("layerly-walk-icon", 0);
  const [carIconIdx, setCarIconIdx] = useLocalStorage("layerly-car-icon", 0);
  const WalkIconSelected = walkIconVariants[Math.max(0, Math.min(walkIconVariants.length - 1, walkIconIdx))];
  const CarIconSelected = carIconVariants[Math.max(0, Math.min(carIconVariants.length - 1, carIconIdx))];

  const owned = useMemo(
    () => new Set<WardrobeSlug>((wardrobeQ.data ?? []).filter((i) => i.owned).map((i) => i.slug as WardrobeSlug)),
    [wardrobeQ.data],
  );

  const isRaining = isRainingCondition(weatherQ.data?.condition);

  const rec = useMemo(() => {
    if (!babyQ.data || !weatherQ.data) return null;
    return recommend({
      feelsLikeC: weatherQ.data.feelsLikeC,
      tempPref: babyQ.data.temperature_pref,
      situation,
      roomTempC: situation === "home" ? roomTemp : undefined,
      transportMode: situation === "walk" ? transportMode : undefined,
      isRaining: situation === "walk" ? isRaining : undefined,
      durationMin: duration,
      owned,
      homeActivity: situation === "home" ? homeActivity : undefined,
      ageMonths,
      uvIndex: weatherQ.data.uvIndex,
    });
  }, [babyQ.data, weatherQ.data, situation, roomTemp, transportMode, isRaining, duration, owned, homeActivity, ageMonths]);

  const feedback = useMutation({
    mutationFn: async (rating: "comfortable" | "cold" | "warm") => {
      if (!babyQ.data || !weatherQ.data || !rec) return;
      const { error } = await supabase.from("feedback").insert({
        baby_id: babyQ.data.id,
        situation,
        temp_c: weatherQ.data.tempC,
        feels_like_c: weatherQ.data.feelsLikeC,
        recommendation: rec as any,
        rating,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Thanks — we'll remember that."),
    onError: (e: any) => toast.error(e.message ?? "Couldn't save"),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (babyQ.isLoading) return <Loading />;
  if (!babyQ.data) {
    return <NoBaby />;
  }
  const baby = babyQ.data;

  const transportOptions: { id: TransportMode; label: string }[] = [
    ...(pramAllowed ? [{ id: "pram" as TransportMode, label: "Pram" }] : []),
    { id: "sitting-stroller", label: "Stroller" },
    { id: "carrier", label: "Carrier" },
  ];

  const situationOptions: { id: Situation; Icon: ComponentType<IconProps>; label: string; description: string }[] = [
    { id: "home", Icon: HomeIcon, label: "Home", description: "Indoors" },
    { id: "walk", Icon: WalkIconSelected, label: "Walk", description: "Outside" },
    { id: "car", Icon: CarIconSelected, label: "Car", description: "In the car" },
  ];

  return (

    <div className="min-h-screen bg-canvas font-sans text-ink pb-16">
      <div className="mx-auto max-w-md px-6 py-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary/60">
              Current location
            </p>
            <h2 className="text-lg font-serif font-semibold">
              {baby.location_label ?? "Somewhere"}
            </h2>
          </div>
          <Link
            to="/baby"
            className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-serif font-semibold"
          >
            {baby.name.charAt(0).toUpperCase()}
          </Link>
        </header>

        {/* Weather (compact) */}
        <section className="mb-6">
          {weatherQ.data ? (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-serif font-semibold text-ink">
                {Math.round(weatherQ.data.tempC)}°
              </span>
              <span className="text-sm text-ink/70">{weatherQ.data.condition}</span>
              <span className="text-sm text-ink/40">
                · Feels like {Math.round(weatherQ.data.feelsLikeC)}°
              </span>
            </div>
          ) : weatherQ.isLoading ? (
            <p className="text-sm text-ink/40">Reading the sky…</p>
          ) : (
            <p className="text-sm text-ink/60">
              Add a location on your{" "}
              <Link to="/baby" className="text-primary underline">
                baby profile
              </Link>{" "}
              to see the weather.
            </p>
          )}
        </section>


        {/* Recommendation moved below activity details */}


        {/* Situation */}
        <section className="mb-8">
          <p className="text-xs font-serif font-medium uppercase tracking-widest text-ink/60 mb-4">
            Today's activity
          </p>
          <div className="grid grid-cols-3 gap-3">
            {situationOptions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSituation(s.id)}
                className={
                  "flex flex-col items-center gap-1.5 py-5 px-2 rounded-2xl transition-all " +
                  (situation === s.id
                    ? "bg-activity-selected text-activity-selected-foreground border-2 border-activity-selected-border shadow-sm shadow-activity-selected-shadow/25 scale-[1.02]"
                    : "bg-surface border border-black/5 hover:bg-canvas text-ink/70")
                }
              >
                <span className={situation === s.id ? "" : "opacity-70"}>
                  <s.Icon size={28} strokeWidth={situation === s.id ? 2 : 1.75} />
                </span>
                <span className={"text-sm font-sans " + (situation === s.id ? "font-bold" : "font-medium")}>
                  {s.label}
                </span>
                <span
                  className={
                    "text-[10px] leading-tight " +
                    (situation === s.id ? "text-activity-selected-foreground/80" : "text-ink/60")
                  }
                >
                  {s.description}
                </span>
              </button>
            ))}
          </div>
        </section>


        {/* Situation extras */}
        <section className="mb-10 bg-surface/60 rounded-2xl p-5 border border-black/5">
          {situation === "home" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-ink/70 mb-2">What will baby be doing?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["playing", "sleeping"] as HomeActivity[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setHomeActivity(a)}
                      className={
                        "py-2 rounded-xl text-sm capitalize inline-flex items-center justify-center gap-2 " +
                        (homeActivity === a
                          ? "bg-primary/15 text-primary font-medium"
                          : "bg-canvas text-ink/70")
                      }
                    >
                      {a === "playing" ? <PlayingIcon size={18} /> : <SleepingIcon size={18} />}
                      {a === "playing" ? "Playing" : "Sleeping"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-ink/70">Room temperature</span>
                  <span className="font-medium">{roomTemp}°C</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={30}
                  value={roomTemp}
                  onChange={(e) => setRoomTemp(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
            </div>
          )}
          {situation === "walk" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-ink/70 mb-2">How will baby travel?</p>
                <div className={"grid gap-2 " + (transportOptions.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                  {transportOptions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setTransportMode(m.id)}
                      className={
                        "py-2 rounded-xl text-sm " +
                        (transportMode === m.id
                          ? "bg-primary/15 text-primary font-medium"
                          : "bg-canvas text-ink/70")
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-ink/70 mb-2">Duration</p>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d as 15 | 30 | 60)}
                      className={
                        "py-2 rounded-xl text-sm " +
                        (duration === d
                          ? "bg-primary/15 text-primary font-medium"
                          : "bg-canvas text-ink/70")
                      }
                    >
                      {d === 60 ? "60+ min" : `${d} min`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {situation === "car" && (
            <div>
              <p className="text-sm text-ink/70 mb-2">Trip duration</p>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d as 15 | 30 | 60)}
                    className={
                      "py-2 rounded-xl text-sm " +
                      (duration === d
                        ? "bg-primary/15 text-primary font-medium"
                        : "bg-canvas text-ink/70")
                    }
                  >
                    {d === 60 ? "60+ min" : `${d} min`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Recommendation (hero) */}
        {rec && (
          <section className="mb-10">
            <div className="bg-surface rounded-[32px] p-7 shadow-sm border border-black/5">
              <h1 className="text-3xl font-serif font-semibold mb-2">
                {rec.babyClothing.length >= 3 ? "Go with layers." : rec.babyClothing.length === 2 ? "Keep it light." : "Just the basics."}
              </h1>
              <p className="text-ink/60 leading-relaxed mb-4">{rec.reason}</p>
              {rec.notes.length > 0 && (
                <div className="space-y-2 mb-6">
                  {rec.notes.map((n, i) => (
                    <p key={i} className="text-xs text-ink/70 border-l-2 border-accent/40 pl-3">
                      {n}
                    </p>
                  ))}
                </div>
              )}

              <p className="text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
                Baby clothing
              </p>
              <div className="space-y-3">
                {rec.babyClothing.map((l) => {
                  const isSynthetic = l.slug === "diaper_only";
                  const isOwned = !isSynthetic && owned.has(l.slug as WardrobeSlug);
                  return (
                    <Row
                      key={l.slot + l.slug}
                      slug={isSynthetic ? undefined : (l.slug as WardrobeSlug)}
                      chip={l.slot.slice(0, 3).toUpperCase()}
                      label={l.label}
                      hint={isSynthetic ? "" : isOwned ? "In your wardrobe" : "Not in your wardrobe"}
                      dim={!isSynthetic && !isOwned}
                    />
                  );
                })}
                {rec.accessories.map((a) => (
                  <Row
                    key={"acc-" + a.slug}
                    slug={a.slug}
                    chip="+"
                    label={a.label}
                    hint={owned.has(a.slug) ? "" : "Not in your wardrobe"}
                    accent
                    dim={!owned.has(a.slug)}
                  />
                ))}
              </div>

              {rec.sleepAccessories.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
                    Sleep accessories
                  </p>
                  <div className="space-y-3">
                    {rec.sleepAccessories.map((a) => (
                      <Row key={"sleep-" + a.slug} slug={a.slug} chip="ZZ" label={a.label} hint="From your wardrobe" />
                    ))}
                  </div>
                </>
              )}

              {rec.transportExtras.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
                    Transport extras
                  </p>
                  <div className="space-y-3">
                    {rec.transportExtras.map((a) => (
                      <Row key={"tx-" + a.slug} slug={a.slug} chip="+" label={a.label} hint="From your wardrobe" />
                    ))}
                  </div>
                </>
              )}

              {rec.safetyAdvice.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-accent/70 mb-2">
                    Weather safety
                  </p>
                  <div className="space-y-2">
                    {rec.safetyAdvice.map((s, i) => (
                      <p key={i} className="text-sm text-ink/80 bg-accent/5 border border-accent/10 rounded-2xl px-4 py-3">
                        {s}
                      </p>
                    ))}
                  </div>
                </>
              )}

              {rec.missingHelpfulItems.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-accent/70 mb-2">
                    Suggested for next time
                  </p>
                  <div className="space-y-3">
                    {rec.missingHelpfulItems.map((a) => (
                      <Row key={"miss-" + a.slug} slug={a.slug} chip="?" label={a.label} hint="Not in your wardrobe" accent dim />
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-ink/50">
                    <Link to="/wardrobe" className="underline">
                      Add to wardrobe
                    </Link>{" "}
                    when you have them.
                  </p>
                </>
              )}
            </div>
          </section>
        )}


        {/* Feedback */}
        <section className="bg-accent/5 rounded-3xl p-6 border border-accent/10">
          <h3 className="text-center font-serif text-lg mb-4">How is {baby.name} feeling?</h3>
          <div className="flex justify-between items-center gap-2">
            <FeedbackBtn emoji="🥶" label="Too cold" onClick={() => feedback.mutate("cold")} />
            <FeedbackBtn
              emoji="😊"
              label="Just right"
              primary
              onClick={() => feedback.mutate("comfortable")}
            />
            <FeedbackBtn emoji="🥵" label="Too warm" onClick={() => feedback.mutate("warm")} />
          </div>
        </section>

        {/* Footer nav */}
        <footer className="mt-10 pt-6 border-t border-black/5 flex justify-between text-sm">
          <Link to="/wardrobe" className="text-primary font-medium">
            Wardrobe →
          </Link>
          <Link to="/baby" className="text-ink/60">
            Baby profile
          </Link>
          <button onClick={signOut} className="text-ink/40">
            Sign out
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({
  chip,
  label,
  hint,
  accent,
  dim,
  slug,
}: {
  chip: string;
  label: string;
  hint?: string;
  accent?: boolean;
  dim?: boolean;
  slug?: WardrobeSlug;
}) {
  return (
    <div className={"flex items-center gap-4 p-3 bg-canvas/60 rounded-2xl " + (dim ? "opacity-60" : "")}>
      <div
        className={
          "size-10 bg-white rounded-lg border border-black/5 flex items-center justify-center " +
          (accent ? "text-accent" : "text-primary")
        }
      >
        {slug ? (
          <ClothingIcon slug={slug} size={22} />
        ) : (
          <span className="text-xs font-medium">{chip}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-[11px] text-ink/40">{hint}</p>}
      </div>
    </div>
  );
}

function FeedbackBtn({
  emoji,
  label,
  primary,
  onClick,
}: {
  emoji: string;
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-2 group">
      <div
        className={
          "rounded-full bg-white border flex items-center justify-center group-active:scale-95 transition-transform shadow-sm " +
          (primary ? "size-14 border-2 border-primary shadow-md" : "size-12 border-black/5")
        }
      >
        <span className="text-xl">{emoji}</span>
      </div>
      <span className={"text-[10px] uppercase tracking-tighter " + (primary ? "font-bold text-primary" : "font-medium")}>
        {label}
      </span>
    </button>
  );
}

function Loading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <p className="text-ink/40 text-sm">Loading…</p>
    </div>
  );
}

function NoBaby() {
  return (
    <div className="min-h-screen bg-canvas font-sans">
      <div className="mx-auto max-w-md px-6 py-16 text-center">
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
