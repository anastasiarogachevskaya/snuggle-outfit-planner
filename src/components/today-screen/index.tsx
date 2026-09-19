import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWeather, feelsLikeAtMinutesFromNow, isRainingCode } from "@/lib/weather";
import { recommend, type Situation, type TransportMode, type HomeActivity } from "@/lib/recommend";
import { type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { ageInMonths } from "@/lib/baby-age";
import { SiteFooter } from "@/components/site-footer";
import { selectionHaptic, lightHaptic } from "@/lib/haptics";
import { WeatherSummary } from "./weather-summary";
import { ActivityPicker } from "./activity-picker";
import { OutfitResult } from "./outfit-result";
import { FeedbackPanel } from "./feedback-panel";
import { CheckOutfitPanel } from "./check-outfit-panel";

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
  // The warmth model doesn't apply to sleep, so drop out of the checker if
  // the parent switches activity while it's open.
  useEffect(() => {
    if (situation === "home" && homeActivity === "sleeping") setCheckingOutfit(false);
  }, [situation, homeActivity]);

  const isRaining = weatherQ.data ? isRainingCode(weatherQ.data.code) : false;

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
      cloudCoverPct: weatherQ.data.cloudCoverPct,
      feelsLikeAtEndC:
        situation === "walk"
          ? (feelsLikeAtMinutesFromNow(weatherQ.data, duration) ?? undefined)
          : undefined,
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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-canvas font-sans text-ink pb-16">
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

        {guest && (
          <p className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-ink/70">
            You're trying Layerly without an account. Nothing is saved yet.
          </p>
        )}

        <section className="mb-6">
          <WeatherSummary
            weather={weatherQ.data}
            isLoading={weatherQ.isLoading}
            isError={weatherQ.isError}
            hasLocation={baby.latitude != null && baby.longitude != null}
            onRetry={() => weatherQ.refetch()}
            onOpenProfile={onOpenProfile}
          />
        </section>

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

        {/* The warmth-comparison model is clo-based and doesn't apply to
            TOG-rated sleep sacks, so this replaces the recommendation card
            only while awake — during sleep there's nothing to check. */}
        {rec && checkingOutfit ? (
          <CheckOutfitPanel
            rec={rec}
            owned={owned}
            weather={weatherQ.data}
            onBack={() => setCheckingOutfit(false)}
          />
        ) : (
          rec && <OutfitResult rec={rec} owned={owned} onOpenWardrobe={onOpenWardrobe} />
        )}

        {rec && !checkingOutfit && !(situation === "home" && homeActivity === "sleeping") && (
          <button
            onClick={() => {
              lightHaptic();
              setCheckingOutfit(true);
            }}
            className="group relative mb-6 w-full text-left"
          >
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/10 to-accent/10 blur-md opacity-60" />
            <div className="relative flex items-center justify-between rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-ink/5 transition-transform duration-150 active:scale-[0.98]">
              <div className="flex flex-col">
                <span className="text-base font-semibold text-ink">Layer up</span>
                <span className="mt-0.5 text-sm text-ink/60">
                  Build your own outfit for today
                </span>
              </div>
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 4 4.5 6 3 11l3 1v7h12v-7l3-1-1.5-5L16 4l-2 1.5a3 3 0 0 1-4 0Z" />
                  <path d="m9 13 2 2 4-4" />
                </svg>
                <span className="absolute -top-1 -right-1 size-3 rounded-full bg-accent ring-2 ring-surface" />
              </div>
            </div>
          </button>
        )}

        {/* Nothing to rate when no outfit could be worked out, and the
            subjective "how did it feel" question doesn't apply while the
            parent is busy answering the objective outfit check instead. */}
        {rec && !checkingOutfit && (
          <FeedbackPanel
            babyName={baby.name}
            feedbackPending={feedbackPending}
            confirmation={confirmation}
            onFeedback={(rating) => onFeedback(rating, feedbackCtx)}
          />
        )}

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
