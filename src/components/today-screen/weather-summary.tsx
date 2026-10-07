import { type fetchWeather } from "@/lib/weather";
import { DepartureTimeWord, hourLabel, type LeaveIn } from "./departure-picker";

export function WeatherSummary({
  weather,
  isLoading,
  isError,
  hasLocation,
  onRetry,
  onOpenProfile,
  timeSelector,
}: {
  weather: Awaited<ReturnType<typeof fetchWeather>> | undefined;
  isLoading: boolean;
  isError: boolean;
  hasLocation: boolean;
  onRetry: () => void;
  onOpenProfile: () => void;
  /** When set (Walk), the leading time word is tappable to pick a later hour. */
  timeSelector?: { value: LeaveIn; onChange: (v: LeaveIn) => void };
}) {
  if (weather) {
    return (
      <div className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-ink/5">
        <div className="flex items-baseline gap-2 flex-wrap">
          {timeSelector && (
            <DepartureTimeWord value={timeSelector.value} onChange={timeSelector.onChange} />
          )}
          <span className="text-4xl font-serif font-semibold text-ink">
            {Math.round(weather.tempC)}°
          </span>
          <span className="text-sm font-medium text-ink/60">{weather.condition}</span>
        </div>
        <p className="mt-1 text-xs text-ink/50">Feels like {Math.round(weather.feelsLikeC)}°</p>
        {timeSelector && timeSelector.value > 0 && (
          <p className="mt-1 text-xs text-ink/60">
            Forecast for{" "}
            {hourLabel(new Date(Date.now() + (timeSelector.value + 30) * 60_000))} — outfit below is
            for then too.
          </p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-ink/40">Reading the sky…</p>;
  }

  // A failed fetch used to fall through to the "add a location" message below,
  // telling parents who already have one to go and add it again.
  if (isError || hasLocation) {
    return (
      <p className="text-sm text-ink/60">
        Couldn't read the weather.{" "}
        <button onClick={onRetry} className="text-primary underline">
          Try again
        </button>
      </p>
    );
  }

  return (
    <p className="text-sm text-ink/60">
      Add a location on your{" "}
      <button onClick={onOpenProfile} className="text-primary underline">
        baby profile
      </button>{" "}
      to see the weather.
    </p>
  );
}
