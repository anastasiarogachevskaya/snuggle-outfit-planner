import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchWeather,
  feelsLikeAtMinutesFromNow,
  isRainingCode,
  weatherAtMinutesFromNow,
} from "@/lib/weather";
import { recommend, type Situation, type TransportMode, type HomeActivity } from "@/lib/recommend";
import { type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { ageInMonths } from "@/lib/baby-age";
import { selectionHaptic, lightHaptic } from "@/lib/haptics";
import { WeatherSummary } from "./weather-summary";
import { ActivityPicker } from "./activity-picker";
import { OutfitResult } from "./outfit-result";
import { FeedbackPanel } from "./feedback-panel";
import { CheckOutfitPanel } from "./check-outfit-panel";
import { applyBottomChoice } from "@/lib/recommend/compare-bottoms";


/** Fires a selection haptic only when the value actually changes. */
function change<T>(current: T, next: T, set: (v: T) => void) {
  if (current === next) return;
  selectionHaptic();
  set(next);
}

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
  duration: 30 | 60 | 90;
  roomTemp: number;
  ageMonths: number | null;
  weather: Awaited<ReturnType<typeof fetchWeather>>;
  rec: NonNullable<ReturnType<typeof recommend>>;
};

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

  const [duration, setDuration] = useState<30 | 60 | 90>(30);
  const [homeActivity, setHomeActivity] = useState<HomeActivity>("playing");
  const [checkingOutfit, setCheckingOutfit] = useState(false);
  const [tab, setTab] = useState<"activity" | "outfit" | "review">("outfit");
  // The warmth model doesn't apply to sleep, so drop out of the checker if
  // the parent switches activity while it's open.
  useEffect(() => {
    if (situation === "home" && homeActivity === "sleeping") setCheckingOutfit(false);
  }, [situation, homeActivity]);

  // Planning ahead only applies outdoors; home uses the room thermometer.
  const [leaveIn, setLeaveIn] = useState(0);
  const planningAhead = situation === "walk" && leaveIn > 0;
  const weather = useMemo(
    () => (weatherQ.data && planningAhead ? weatherAtMinutesFromNow(weatherQ.data, leaveIn) : weatherQ.data),
    [weatherQ.data, planningAhead, leaveIn],
  );

  const isRaining = weather ? isRainingCode(weather.code) : false;

  const rec = useMemo(() => {
    if (!weather) return null;
    return recommend({
      feelsLikeC: weather.feelsLikeC,
      tempPref: baby.temperature_pref,
      situation,
      roomTempC: situation === "home" ? roomTemp : undefined,
      transportMode: situation === "walk" ? transportMode : undefined,
      isRaining: situation === "walk" ? isRaining : undefined,
      durationMin: duration,
      owned,
      homeActivity: situation === "home" ? homeActivity : undefined,
      ageMonths,
      uvIndex: weather.uvIndex,
      cloudCoverPct: weather.cloudCoverPct,
      feelsLikeAtEndC:
        situation === "walk"
          ? (feelsLikeAtMinutesFromNow(weatherQ.data!, (planningAhead ? leaveIn : 0) + duration) ?? undefined)
          : undefined,
    });
  }, [
    baby.temperature_pref,
    weather,
    weatherQ.data,
    planningAhead,
    leaveIn,
    situation,
    roomTemp,
    transportMode,
    isRaining,
    duration,
    owned,
    homeActivity,
    ageMonths,
  ]);

  // A bottom the parent applied from the comparison. Cleared whenever the
  // situation changes, since the outfit behind it is no longer the same.
  const [appliedBottom, setAppliedBottom] = useState<WardrobeSlug | null>(null);
  useEffect(() => {
    setAppliedBottom(null);
  }, [situation, homeActivity, transportMode, duration, roomTemp]);

  const displayedRec = useMemo(() => {
    if (!rec || !appliedBottom) return rec;
    return applyBottomChoice(rec, appliedBottom, owned);
  }, [rec, appliedBottom, owned]);

  const feedbackCtx: FeedbackContext | null =
    weather && rec
      ? {
          situation,
          homeActivity,
          transportMode,
          duration,
          roomTemp,
          ageMonths,
          weather: weather,
          rec,
        }
      : null;

  const summary =
    situation === "walk"
      ? `Walk · ${transportMode === "pram" ? "Pram" : transportMode === "carrier" ? "Carrier" : "Stroller"} · ${duration === 90 ? "60+" : duration} min`
      : situation === "home"
        ? `Home · ${homeActivity === "sleeping" ? "Sleeping" : "Awake"} · ${roomTemp}°`
        : "Car";

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-canvas font-sans text-ink pb-32">
      <div className="mx-auto w-full max-w-md min-w-0 px-6 py-6">
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

        <section className="mb-5">
          <WeatherSummary
            weather={weather}
            isLoading={weatherQ.isLoading}
            isError={weatherQ.isError}
            hasLocation={baby.latitude != null && baby.longitude != null}
            onRetry={() => weatherQ.refetch()}
            onOpenProfile={onOpenProfile}
            timeSelector={
              situation === "walk" && weatherQ.data
                ? { value: leaveIn, onChange: setLeaveIn }
                : undefined
            }
          />
        </section>

        <div role="tablist" className="mb-6 flex rounded-2xl bg-ink/5 p-1">
          {(["activity", "outfit", "review"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => change(tab, t, setTab)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition-all ${
                tab === t ? "bg-surface text-primary shadow-sm" : "text-ink/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "activity" && (
          <>
            <ActivityPicker
              situation={situation}
              onSituationChange={(s) => change(situation, s, setSituation)}
              pramAllowed={pramAllowed}
              transportMode={transportMode}
              onTransportModeChange={(m) => change(transportMode, m, setTransportMode)}
              duration={duration}
              onDurationChange={(d) => change(duration, d, setDuration)}
              homeActivity={homeActivity}
              onHomeActivityChange={(a) => change(homeActivity, a, setHomeActivity)}
              roomTemp={roomTemp}
              onRoomTempChange={setRoomTemp}
            />
            <button
              onClick={() => setTab("outfit")}
              className="mt-2 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              See outfit
            </button>
          </>
        )}

        {tab === "outfit" && (
          <>
            <button
              onClick={() => setTab("activity")}
              className="mb-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {summary} <span aria-hidden>›</span>
            </button>
            {/* The warmth-comparison model is clo-based and doesn't apply to
                TOG-rated sleep sacks, so this replaces the recommendation card
                only while awake. */}
            {rec && checkingOutfit ? (
              <CheckOutfitPanel
                rec={rec}
                owned={owned}
                weather={weather}
                onBack={() => setCheckingOutfit(false)}
              />
            ) : (
              rec &&
              displayedRec && (
                <OutfitResult rec={displayedRec} owned={owned} onOpenWardrobe={onOpenWardrobe} />
              )
            )}
          </>
        )}

        {tab === "review" && (
          <>
            {rec && !planningAhead ? (
              <FeedbackPanel
                babyName={baby.name}
                feedbackPending={feedbackPending}
                confirmation={confirmation}
                onFeedback={(rating) => onFeedback(rating, feedbackCtx)}
              />
            ) : (
              <p className="rounded-2xl bg-surface p-5 text-sm text-ink/60 ring-1 ring-ink/5">
                You can rate the outfit once you're back from the walk.
              </p>
            )}
            {guest && (
              <p className="mt-4 text-xs text-ink/50">
                You're trying Layerly without an account. Nothing is saved yet.
              </p>
            )}
            <nav className="mt-6 divide-y divide-ink/5 overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/5 text-sm">
              <button onClick={onOpenWardrobe} className="flex w-full justify-between px-5 py-4 text-left font-medium text-ink">
                Wardrobe <span className="text-ink/30">›</span>
              </button>
              <button onClick={onOpenProfile} className="flex w-full justify-between px-5 py-4 text-left text-ink">
                Baby profile <span className="text-ink/30">›</span>
              </button>
              <button onClick={secondaryAction.onClick} className="flex w-full justify-between px-5 py-4 text-left text-ink/60">
                {secondaryAction.label} <span className="text-ink/30">›</span>
              </button>
            </nav>
          </>
        )}
      </div>

      {rec && !checkingOutfit && !(situation === "home" && homeActivity === "sleeping") && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/5 bg-surface pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => {
              lightHaptic();
              setTab("outfit");
              setCheckingOutfit(true);
            }}
            className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-4 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">Layer up</span>
              <span className="block text-xs text-ink/50">Build your own outfit</span>
            </span>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-ink text-canvas shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
