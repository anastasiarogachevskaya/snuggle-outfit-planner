export type Weather = {
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  code: number;
  condition: string;
  uvIndex?: number;
  /** Open-Meteo's own timestamp for `current`, used as the origin for hourly lookups. */
  asOfIso?: string;
  /** Hourly forecast, aligned index-for-index — used to look ahead from `asOfIso`. */
  hourlyTimeIso: string[];
  hourlyFeelsLikeC: number[];
};

// https://open-meteo.com/en/docs — no API key.
export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,wind_speed_10m,weather_code,uv_index",
  );
  // Only need a few hours ahead (the longest walk duration option is 90 min),
  // but 2 days covers a "now" close to midnight without extra complexity.
  url.searchParams.set("hourly", "apparent_temperature");
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("wind_speed_unit", "kmh");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("weather fetch failed");
  const json = await res.json();
  const c = json.current;
  const uv = typeof c.uv_index === "number" ? c.uv_index : undefined;
  return {
    tempC: c.temperature_2m,
    feelsLikeC: c.apparent_temperature,
    windKph: c.wind_speed_10m,
    code: c.weather_code,
    condition: describeCode(c.weather_code),
    uvIndex: uv,
    asOfIso: c.time,
    hourlyTimeIso: json.hourly?.time ?? [],
    hourlyFeelsLikeC: json.hourly?.apparent_temperature ?? [],
  };
}

/**
 * Forecast "feels like" temperature roughly `minutesFromNow` minutes ahead —
 * used to warn when the outfit picked for the current temperature will be
 * wrong by the end of a walk (e.g. the sun warms things up over an hour).
 * Returns null if there's no hourly data to look up (e.g. in tests that
 * stub a bare `current` response).
 */
export function feelsLikeAtMinutesFromNow(weather: Weather, minutesFromNow: number): number | null {
  if (!weather.asOfIso || weather.hourlyTimeIso.length === 0) return null;
  const targetMs = new Date(weather.asOfIso).getTime() + minutesFromNow * 60_000;
  let closestIdx = -1;
  let closestDiffMs = Infinity;
  for (let i = 0; i < weather.hourlyTimeIso.length; i++) {
    const diffMs = Math.abs(new Date(weather.hourlyTimeIso[i]).getTime() - targetMs);
    if (diffMs < closestDiffMs) {
      closestDiffMs = diffMs;
      closestIdx = i;
    }
  }
  return closestIdx === -1 ? null : weather.hourlyFeelsLikeC[closestIdx];
}

function describeCode(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Mostly clear";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Cloudy";
}
