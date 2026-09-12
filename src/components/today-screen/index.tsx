import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWeather, feelsLikeAtMinutesFromNow } from "@/lib/weather";
import { recommend, type Situation, type TransportMode, type HomeActivity } from "@/lib/recommend";
import { type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { SiteFooter } from "@/components/site-footer";
import { selectionHaptic } from "@/lib/haptics";
import { WeatherSummary } from "./weather-summary";
import { ActivityPicker } from "./activity-picker";
import { OutfitResult } from "./outfit-result";
import { FeedbackPanel } from "./feedback-panel";

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

  const [duration, setDuration] = useState<30 | 60 | 90>(30);
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

        {rec && <OutfitResult rec={rec} owned={owned} onOpenWardrobe={onOpenWardrobe} />}

        <FeedbackPanel
          babyName={baby.name}
          feedbackPending={feedbackPending}
          confirmation={confirmation}
          onFeedback={(rating) => onFeedback(rating, feedbackCtx)}
        />

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
