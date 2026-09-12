import { type fetchWeather } from "@/lib/weather";

export function WeatherSummary({
  weather,
  isLoading,
  onOpenProfile,
}: {
  weather: Awaited<ReturnType<typeof fetchWeather>> | undefined;
  isLoading: boolean;
  onOpenProfile: () => void;
}) {
  if (weather) {
    return (
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-serif font-semibold text-ink">
          {Math.round(weather.tempC)}°
        </span>
        <span className="text-sm text-ink/70">{weather.condition}</span>
        <span className="text-sm text-ink/40">· Feels like {Math.round(weather.feelsLikeC)}°</span>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-ink/40">Reading the sky…</p>;
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
