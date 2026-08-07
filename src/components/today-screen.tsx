import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWeather } from "@/lib/weather";
import { recommend, type Situation, type TransportMode, type HomeActivity } from "@/lib/recommend";
import { type WardrobeSlug } from "@/lib/wardrobe-catalog";
import {
import { SiteFooter } from "@/components/site-footer";
  HomeIcon,
  WalkIcon,
  CarIcon,
  PlayingIcon,
  SleepingIcon,
  ClothingIcon,
} from "@/components/icons";

export type TodayBaby = {
  id: string;
  name: string;
  dob: string | null;
  temperature_pref: number;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
};

export type FeedbackContext = {
  situation: Situation;
  homeActivity: HomeActivity;
  transportMode: TransportMode;
  duration: 15 | 30 | 60;
  roomTemp: number;
  ageMonths: number | null;
  weather: Awaited<ReturnType<typeof fetchWeather>>;
  rec: NonNullable<ReturnType<typeof recommend>>;
};

export function ageInMonths(dob: string | null | undefined): number | null {
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

export function TodayScreen({
  baby,
  owned,
  guest = false,
  feedbackPending = false,
  confirmation = null,
  onFeedback,
  onOpenProfile,
  onOpenWardrobe,
  secondaryAction,
}: {
  baby: TodayBaby;
  owned: Set<WardrobeSlug>;
  guest?: boolean;
  feedbackPending?: boolean;
  confirmation?: null | "cold" | "comfortable" | "warm";
  onFeedback: (rating: "cold" | "comfortable" | "warm", ctx: FeedbackContext | null) => void;
  onOpenProfile: () => void;
  onOpenWardrobe: () => void;
  secondaryAction: { label: string; onClick: () => void };
}) {
  const weatherQ = useQuery({
    queryKey: ["weather", baby.latitude, baby.longitude],
    enabled: baby.latitude != null && baby.longitude != null,
    staleTime: 5 * 60_000,
    queryFn: () => fetchWeather(baby.latitude!, baby.longitude!),
  });

  const [situation, setSituation] = useState<Situation>("walk");
  const babyId = baby.id;
  const [roomTemp, setRoomTemp] = useState(21);
  useEffect(() => {
    if (!babyId || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(`layerly:roomTemp:${babyId}`);
    const n = stored ? Number(stored) : NaN;
    setRoomTemp(Number.isFinite(n) ? n : 21);
  }, [babyId]);
  useEffect(() => {
    if (!babyId || typeof window === "undefined") return;
    window.localStorage.setItem(`layerly:roomTemp:${babyId}`, String(roomTemp));
  }, [babyId, roomTemp]);

  const ageMonths = ageInMonths(baby.dob);
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

  const isRaining = isRainingCondition(weatherQ.data?.condition);

  const rec = useMemo(() => {
    if (!weatherQ.data) return null;
    return recommend({
      feelsLikeC: weatherQ.data.feelsLikeC,
      tempPref: baby.temperature_pref,
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
  }, [
    baby.temperature_pref,
    weatherQ.data,
    situation,
    roomTemp,
    transportMode,
    isRaining,
    duration,
    owned,
    homeActivity,
    ageMonths,
  ]);

  const feedbackCtx: FeedbackContext | null =
    weatherQ.data && rec
      ? {
          situation,
          homeActivity,
          transportMode,
          duration,
          roomTemp,
          ageMonths,
          weather: weatherQ.data,
          rec,
        }
      : null;

  const transportOptions: { id: TransportMode; label: string }[] = [
    ...(pramAllowed ? [{ id: "pram" as TransportMode, label: "Pram" }] : []),
    { id: "sitting-stroller", label: "Stroller" },
    { id: "carrier", label: "Carrier" },
  ];

  const situationOptions: { id: Situation; Icon: typeof HomeIcon; label: string; description: string }[] = [
    { id: "home", Icon: HomeIcon, label: "Home", description: "Indoors" },
    { id: "walk", Icon: WalkIcon, label: "Walk", description: "Outside" },
    { id: "car", Icon: CarIcon, label: "Car", description: "In the car" },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-canvas font-sans text-ink pb-16">
      <div className="mx-auto w-full max-w-md min-w-0 px-6 py-6">
        {/* Header */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-primary/60">
              Current location
            </p>
            <h2 className="truncate text-lg font-serif font-semibold">
              {baby.location_label ?? "Somewhere"}
            </h2>
          </div>
          <button
            onClick={onOpenProfile}
            className="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-serif font-semibold"
          >
            {baby.name.charAt(0).toUpperCase()}
          </button>
        </header>

        {guest && (
          <p className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-ink/70">
            You're trying Layerly without an account. Nothing is saved yet.
          </p>
        )}

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
              <button onClick={onOpenProfile} className="text-primary underline">
                baby profile
              </button>{" "}
              to see the weather.
            </p>
          )}
        </section>

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
            <div className="w-full max-w-full overflow-hidden bg-surface rounded-[32px] p-7 shadow-sm border border-black/5">
              <h1 className="text-3xl font-serif font-semibold mb-2">
                {rec.babyClothing.length >= 3
                  ? "Go with layers."
                  : rec.babyClothing.length === 2
                    ? "Keep it light."
                    : "Just the basics."}
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
                      <p
                        key={i}
                        className="text-sm text-ink/80 bg-accent/5 border border-accent/10 rounded-2xl px-4 py-3"
                      >
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
                    <button onClick={onOpenWardrobe} className="underline">
                      Add to wardrobe
                    </button>{" "}
                    when you have them.
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        {/* Feedback */}
        <section className="bg-accent/5 rounded-3xl p-6 border border-accent/10">
          <h3 className="text-center font-serif text-lg mb-1">How was today's outfit?</h3>
          <p className="text-center text-xs text-ink/50 mb-4">
            Your feedback helps Layerly learn what works for {baby.name}.
          </p>
          <div className="grid grid-cols-3 items-start gap-2">
            <FeedbackBtn
              emoji="🥶"
              label="Too cold"
              disabled={feedbackPending}
              onClick={() => onFeedback("cold", feedbackCtx)}
            />
            <FeedbackBtn
              emoji="😊"
              label="Just right"
              primary
              disabled={feedbackPending}
              onClick={() => onFeedback("comfortable", feedbackCtx)}
            />
            <FeedbackBtn
              emoji="🥵"
              label="Too warm"
              disabled={feedbackPending}
              onClick={() => onFeedback("warm", feedbackCtx)}
            />
          </div>
          {confirmation && (
            <div className="mt-4 rounded-2xl bg-white/70 border border-accent/20 px-4 py-3 text-center text-sm text-ink/80 animate-in fade-in">
              {confirmation === "comfortable" && "😊 Thanks! We'll remember this recommendation worked well."}
              {confirmation === "cold" && "🥶 Thanks! We'll make future recommendations slightly warmer."}
              {confirmation === "warm" && "🥵 Thanks! We'll make future recommendations slightly lighter."}
            </div>
          )}
        </section>

        {/* Footer nav */}
        <footer className="mt-10 grid grid-cols-3 items-center gap-2 border-t border-black/5 pt-6 text-sm">
          <button onClick={onOpenWardrobe} className="text-left text-primary font-medium">
            Wardrobe →
          </button>
          <button onClick={onOpenProfile} className="text-center text-ink/60">
            Baby profile
          </button>
          <button onClick={secondaryAction.onClick} className="text-right text-ink/40">
            {secondaryAction.label}
          </button>
        </footer>

        <SiteFooter className="mt-10" />
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
    <div className={"flex min-w-0 items-center gap-4 p-3 bg-canvas/60 rounded-2xl " + (dim ? "opacity-60" : "")}>
      <div
        className={
          "size-10 shrink-0 bg-white rounded-lg border border-black/5 flex items-center justify-center " +
          (accent ? "text-accent" : "text-primary")
        }
      >
        {slug ? <ClothingIcon slug={slug} size={22} /> : <span className="text-xs font-medium">{chip}</span>}
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">{label}</p>
        {hint && <p className="text-[11px] text-ink/40">{hint}</p>}
      </div>
    </div>
  );
}

function FeedbackBtn({
  emoji,
  label,
  primary,
  disabled,
  onClick,
}: {
  emoji: string;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="min-w-0 flex flex-col items-center gap-2 group disabled:opacity-50">
      <div
        className={
          "rounded-full bg-white border flex items-center justify-center group-active:scale-95 transition-transform shadow-sm " +
          (primary ? "size-14 border-2 border-primary shadow-md" : "size-12 border-black/5")
        }
      >
        <span className="text-xl">{emoji}</span>
      </div>
      <span
        className={
          "max-w-full text-center text-[10px] uppercase tracking-tighter " +
          (primary ? "font-bold text-primary" : "font-medium")
        }
      >
        {label}
      </span>
    </button>
  );
}
