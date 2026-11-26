import { absoluteTime, forecastSampleAt } from "./outing-weather";

export type Weather = {
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  code: number;
  condition: string;
  uvIndex?: number;
  /** Cloud cover, 0–100%. Used to soften sun advice under an overcast sky. */
  cloudCoverPct?: number;
  /** Open-Meteo's own timestamp for `current`, an absolute source instant (not the departure clock). */
  asOfIso?: string;
  /** Hourly forecast, aligned index-for-index — timestamps are absolute UTC instants. */
  hourlyTimeIso: string[];
  hourlyFeelsLikeC: (number | null)[];
  hourlyTempC?: (number | null)[];
  hourlyCode?: (number | null)[];
  hourlyUv?: (number | null)[];
  hourlyCloudPct?: (number | null)[];
  hourlyWindKph?: (number | null)[];
  hourlyRainMm?: (number | null)[];
  hourlyShowersMm?: (number | null)[];
  hourlyGustKph?: (number | null)[];
  sourceTimezone?: string;
  fetchedAtIso?: string;
};

// https://open-meteo.com/en/docs — no API key.
export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,wind_speed_10m,weather_code,uv_index,cloud_cover",
  );
  // Fixed two-day hourly coverage, independent of the entered duration.
  // The resolver reports missing coverage instead of extending this horizon.
  url.searchParams.set(
    "hourly",
    "apparent_temperature,temperature_2m,weather_code,uv_index,cloud_cover,wind_speed_10m,wind_gusts_10m,rain,showers",
  );
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("wind_speed_unit", "kmh");
  // A stalled connection would otherwise leave "Reading the sky…" on screen
  // indefinitely, through every retry.
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error("weather fetch failed");
  const json = await res.json();
  const c = json.current;
  if (
    !c ||
    ![c.temperature_2m, c.apparent_temperature, c.wind_speed_10m, c.weather_code].every(
      (v) => typeof v === "number" && Number.isFinite(v),
    )
  )
    throw new Error("weather readings unavailable");
  const uv = typeof c.uv_index === "number" ? c.uv_index : undefined;
  return {
    tempC: c.temperature_2m,
    feelsLikeC: c.apparent_temperature,
    windKph: c.wind_speed_10m,
    code: c.weather_code,
    condition: describeCode(c.weather_code),
    uvIndex: uv,
    cloudCoverPct: typeof c.cloud_cover === "number" ? c.cloud_cover : undefined,
    asOfIso: providerTime(c.time),
    sourceTimezone: json.timezone,
    fetchedAtIso: new Date().toISOString(),
    hourlyTimeIso: (json.hourly?.time ?? []).map(providerTime),
    hourlyFeelsLikeC: json.hourly?.apparent_temperature ?? [],
    hourlyTempC: json.hourly?.temperature_2m,
    hourlyCode: json.hourly?.weather_code,
    hourlyUv: json.hourly?.uv_index,
    hourlyCloudPct: json.hourly?.cloud_cover,
    hourlyWindKph: json.hourly?.wind_speed_10m,
    hourlyGustKph: json.hourly?.wind_gusts_10m,
    hourlyRainMm: json.hourly?.rain,
    hourlyShowersMm: json.hourly?.showers,
  };
}

// Numeric provider timestamps are UTC seconds, regardless of location or DST.
// Explicit-offset ISO fixtures are also supported; zone-less strings are rejected by the resolver.
function providerTime(value: number | string): string {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : value;
}

export function feelsLikeAtMinutesFromNow(
  weather: Weather,
  minutesFromNow: number,
  reference = weather.fetchedAtIso ?? weather.asOfIso,
): number | null {
  return forecastSampleAt(weather, minutesFromNow, reference)?.feelsLikeC ?? null;
}

/** No substituted current fields for an unavailable future departure. */
export function weatherAtMinutesFromNow(
  weather: Weather,
  minutesFromNow: number,
  reference = weather.fetchedAtIso ?? weather.asOfIso,
): Weather | null {
  if (minutesFromNow === 0) return weather;
  const sample = forecastSampleAt(weather, minutesFromNow, reference);
  if (
    !sample ||
    sample.tempC === null ||
    sample.feelsLikeC === null ||
    sample.windKph === null ||
    sample.code === null
  )
    return null;
  const i = weather.hourlyTimeIso.findIndex(
    (time) => absoluteTime(time) === absoluteTime(sample.time),
  );
  return {
    ...weather,
    tempC: sample.tempC,
    feelsLikeC: sample.feelsLikeC,
    windKph: sample.windKph,
    code: sample.code,
    condition: describeCode(sample.code),
    uvIndex: weather.hourlyUv?.[i] ?? undefined,
    cloudCoverPct: weather.hourlyCloudPct?.[i] ?? undefined,
    asOfIso: sample.time,
  };
}

const DRIZZLE_CODES = [51, 53, 55, 56, 57];
const RAIN_CODES = [61, 63, 65, 66, 67, 80, 81, 82];
const THUNDERSTORM_CODES = [95, 96, 99];

function describeCode(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Mostly clear";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if (DRIZZLE_CODES.includes(code)) return "Drizzle";
  if (RAIN_CODES.includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if (THUNDERSTORM_CODES.includes(code)) return "Thunderstorm";
  return "Cloudy";
}

/**
 * Whether a stroller rain cover is warranted. Shared by the web app and the
 * MCP tools so both agree on the same weather reading — this directly gates
 * the rain_cover recommendation in recommend/pick-outdoor.ts.
 */
export function isRainingCode(code: number): boolean {
  return (
    DRIZZLE_CODES.includes(code) || RAIN_CODES.includes(code) || THUNDERSTORM_CODES.includes(code)
  );
}
