export type Weather = {
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  code: number;
  condition: string;
  uvIndex?: number;
  /** Cloud cover, 0–100%. Used to soften sun advice under an overcast sky. */
  cloudCoverPct?: number;
  /** Open-Meteo's own timestamp for `current`, used as the origin for hourly lookups. */
  asOfIso?: string;
  /** Hourly forecast, aligned index-for-index — used to look ahead from `asOfIso`. */
  hourlyTimeIso: string[];
  hourlyFeelsLikeC: number[];
  hourlyTempC?: number[];
  hourlyCode?: number[];
  hourlyUv?: number[];
  hourlyCloudPct?: number[];
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
  // Only need a few hours ahead (the longest walk duration option is 90 min),
  // but 2 days covers a "now" close to midnight without extra complexity.
  url.searchParams.set(
    "hourly",
    "apparent_temperature,temperature_2m,weather_code,uv_index,cloud_cover",
  );
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("wind_speed_unit", "kmh");
  // A stalled connection would otherwise leave "Reading the sky…" on screen
  // indefinitely, through every retry.
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
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
    cloudCoverPct: typeof c.cloud_cover === "number" ? c.cloud_cover : undefined,
    asOfIso: c.time,
    hourlyTimeIso: json.hourly?.time ?? [],
    hourlyFeelsLikeC: json.hourly?.apparent_temperature ?? [],
    hourlyTempC: json.hourly?.temperature_2m,
    hourlyCode: json.hourly?.weather_code,
    hourlyUv: json.hourly?.uv_index,
    hourlyCloudPct: json.hourly?.cloud_cover,
  };
}

/**
 * Forecast "feels like" temperature roughly `minutesFromNow` minutes ahead —
 * used to warn when the outfit picked for the current temperature will be
 * wrong by the end of a walk (e.g. the sun warms things up over an hour).
 * Returns null if there's no hourly data to look up (e.g. in tests that
 * stub a bare `current` response).
 */
function closestHourIdx(weather: Weather, minutesFromNow: number): number {
  if (!weather.asOfIso || weather.hourlyTimeIso.length === 0) return -1;
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
  return closestIdx;
}

export function feelsLikeAtMinutesFromNow(weather: Weather, minutesFromNow: number): number | null {
  const i = closestHourIdx(weather, minutesFromNow);
  return i === -1 ? null : (weather.hourlyFeelsLikeC[i] ?? null);
}

/**
 * The forecast reshaped as a "current" reading `minutesFromNow` ahead, so the
 * whole recommendation engine can plan for a later departure unchanged.
 * Returns the original weather for 0 or when no hourly data exists.
 */
export function weatherAtMinutesFromNow(weather: Weather, minutesFromNow: number): Weather {
  if (minutesFromNow <= 0) return weather;
  const i = closestHourIdx(weather, minutesFromNow);
  if (i === -1) return weather;
  const code = weather.hourlyCode?.[i] ?? weather.code;
  const asOfMs = new Date(weather.asOfIso!).getTime() + minutesFromNow * 60_000;
  return {
    ...weather,
    tempC: weather.hourlyTempC?.[i] ?? weather.tempC,
    feelsLikeC: weather.hourlyFeelsLikeC[i] ?? weather.feelsLikeC,
    code,
    condition: describeCode(code),
    uvIndex: weather.hourlyUv?.[i] ?? weather.uvIndex,
    cloudCoverPct: weather.hourlyCloudPct?.[i] ?? weather.cloudCoverPct,
    asOfIso: localIso(asOfMs, weather.asOfIso!),
  };
}

// Open-Meteo times are zone-less local strings ("2026-10-04T10:15"); keep that shape.
function localIso(ms: number, _ref: string): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
