import type { Weather } from "./weather";
import { isDurationMinutes } from "./outing-duration";

const HOUR = 3_600_000;
const MAX_SAMPLES = 768; // Fixed bound, independent of requested duration.
export type WeatherField =
  | "tempC"
  | "feelsLikeC"
  | "windKph"
  | "code"
  | "rainMm"
  | "showersMm"
  | "gustKph";
export type ForecastSample = {
  time: string;
  tempC: number | null;
  feelsLikeC: number | null;
  windKph: number | null;
  code: number | null;
  rainMm: number | null;
  showersMm: number | null;
  gustKph: number | null;
};
export type OutingWeather = {
  departure: string | null;
  return: string | null;
  source: {
    provider: "Open-Meteo";
    timezone: string | null;
    fetchedAt: string | null;
    currentAsOf: string | null;
    modelRun: null;
  };
  samples: ForecastSample[];
  intervals: {
    start: string;
    end: string;
    overlapStart: string;
    overlapEnd: string;
    startSample: ForecastSample | null;
    endSample: ForecastSample;
    missingFields: WeatherField[];
  }[];
  coverage: "complete" | "partial" | "unavailable";
  gaps: {
    start: string | null;
    end: string | null;
    reason:
      | "outside_forecast"
      | "missing_hour"
      | "missing_fields"
      | "invalid_request"
      | "ambiguous_timestamp";
    fields: WeatherField[];
  }[];
  summary: {
    temperatureRangeC: [number, number] | null;
    feelsLikeRangeC: [number, number] | null;
    windRangeKph: [number, number] | null;
    maxGustKph: number | null;
    rainPeriods: { start: string; end: string; rainMm: number | null; showersMm: number | null }[];
  };
  truncated: boolean;
};

/** Only absolute instants: never let a phone interpret a zone-less location time. */
export function absoluteTime(value: string | undefined): number | null {
  if (!value || !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
const iso = (ms: number) => new Date(ms).toISOString();
const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
function allSamples(weather: Weather): ForecastSample[] {
  return weather.hourlyTimeIso
    .slice(0, MAX_SAMPLES)
    .flatMap((time, i) => {
      const ms = absoluteTime(time);
      return ms === null
        ? []
        : [
            {
              time: iso(ms),
              tempC: numberOrNull(weather.hourlyTempC?.[i]),
              feelsLikeC: numberOrNull(weather.hourlyFeelsLikeC[i]),
              windKph: numberOrNull(weather.hourlyWindKph?.[i]),
              code: numberOrNull(weather.hourlyCode?.[i]),
              rainMm: numberOrNull(weather.hourlyRainMm?.[i]),
              showersMm: numberOrNull(weather.hourlyShowersMm?.[i]),
              gustKph: numberOrNull(weather.hourlyGustKph?.[i]),
            },
          ];
    })
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}
function range(
  samples: ForecastSample[],
  field: "tempC" | "feelsLikeC" | "windKph",
): [number, number] | null {
  const values = samples.flatMap((s) => (s[field] === null ? [] : [s[field]]));
  return values.length ? [Math.min(...values), Math.max(...values)] : null;
}

/**
 * Open-Meteo hourly temperature/wind/code are INSTANT samples, not hour-long
 * observations. Bracketing samples establish hourly resolution, never minute
 * accuracy. Rain/showers are preceding-hour sums; gust is preceding-hour max.
 * A complete interval needs both bounding instants and its end's rain fields.
 * Gust is optional: its absence is explicit but does not invalidate coverage.
 */
export function resolveOutingWeather(
  weather: Weather,
  duration: number,
  delay = 0,
  reference = weather.fetchedAtIso ?? weather.asOfIso,
): OutingWeather {
  const origin = absoluteTime(reference);
  const departureMs = origin === null ? NaN : origin + delay * 60_000;
  const returnMs = departureMs + duration * 60_000;
  const valid =
    isDurationMinutes(duration) &&
    Number.isSafeInteger(delay) &&
    delay >= 0 &&
    Number.isFinite(departureMs) &&
    Number.isFinite(returnMs) &&
    Math.abs(returnMs) <= 8.64e15;
  const result: OutingWeather = {
    departure: valid ? iso(departureMs) : null,
    return: valid ? iso(returnMs) : null,
    source: {
      provider: "Open-Meteo",
      timezone: weather.sourceTimezone ?? null,
      fetchedAt: weather.fetchedAtIso ?? null,
      currentAsOf: weather.asOfIso ?? null,
      modelRun: null,
    },
    samples: [],
    intervals: [],
    coverage: "unavailable",
    gaps: [],
    summary: {
      temperatureRangeC: null,
      feelsLikeRangeC: null,
      windRangeKph: null,
      maxGustKph: null,
      rainPeriods: [],
    },
    truncated: weather.hourlyTimeIso.length > MAX_SAMPLES,
  };
  if (!valid) {
    result.gaps.push({
      start: null,
      end: null,
      reason: origin === null ? "ambiguous_timestamp" : "invalid_request",
      fields: [],
    });
    return result;
  }
  const samples = allSamples(weather);
  const byTime = new Map(samples.map((s) => [Date.parse(s.time), s]));
  const used = new Map<string, ForecastSample>();
  let cursor = departureMs;
  const first = samples[0];
  const last = samples.at(-1);
  for (const endSample of samples) {
    const end = Date.parse(endSample.time),
      start = end - HOUR;
    if (end <= departureMs || start >= returnMs) continue;
    const overlapStart = Math.max(start, departureMs),
      overlapEnd = Math.min(end, returnMs);
    if (overlapStart > cursor)
      result.gaps.push({
        start: iso(cursor),
        end: iso(overlapStart),
        reason: first && cursor >= Date.parse(first.time) ? "missing_hour" : "outside_forecast",
        fields: [],
      });
    const startSample = byTime.get(start) ?? null;
    const missing: WeatherField[] = [];
    for (const field of ["tempC", "feelsLikeC", "windKph", "code"] as const)
      if (startSample?.[field] == null || endSample[field] === null) missing.push(field);
    for (const field of ["rainMm", "showersMm", "gustKph"] as const)
      if (endSample[field] === null) missing.push(field);
    result.intervals.push({
      start: iso(start),
      end: iso(end),
      overlapStart: iso(overlapStart),
      overlapEnd: iso(overlapEnd),
      startSample,
      endSample,
      missingFields: missing,
    });
    if (startSample) used.set(startSample.time, startSample);
    used.set(endSample.time, endSample);
    const requiredMissing = missing.filter((f) => f !== "gustKph");
    if (!startSample || requiredMissing.length)
      result.gaps.push({
        start: iso(overlapStart),
        end: iso(overlapEnd),
        reason: !startSample
          ? first && start < Date.parse(first.time)
            ? "outside_forecast"
            : "missing_hour"
          : "missing_fields",
        fields: requiredMissing,
      });
    cursor = Math.max(cursor, overlapEnd);
  }
  if (cursor < returnMs)
    result.gaps.push({
      start: iso(cursor),
      end: iso(returnMs),
      reason: last && cursor < Date.parse(last.time) ? "missing_hour" : "outside_forecast",
      fields: [],
    });
  result.samples = [...used.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  result.coverage =
    result.gaps.length === 0
      ? "complete"
      : result.samples.some(
            (s) =>
              s.tempC !== null ||
              s.feelsLikeC !== null ||
              s.windKph !== null ||
              s.rainMm !== null ||
              s.showersMm !== null,
          )
        ? "partial"
        : "unavailable";
  result.summary.temperatureRangeC = range(result.samples, "tempC");
  result.summary.feelsLikeRangeC = range(result.samples, "feelsLikeC");
  result.summary.windRangeKph = range(result.samples, "windKph");
  const gusts = result.intervals.flatMap((i) =>
    i.endSample.gustKph === null ? [] : [i.endSample.gustKph],
  );
  result.summary.maxGustKph = gusts.length ? Math.max(...gusts) : null;
  result.summary.rainPeriods = result.intervals
    .filter((i) => (i.endSample.rainMm ?? 0) > 0 || (i.endSample.showersMm ?? 0) > 0)
    .map((i) => ({
      start: i.start,
      end: i.end,
      rainMm: i.endSample.rainMm,
      showersMm: i.endSample.showersMm,
    }));
  return result;
}

/** Compatibility lookup: preceding instant, only inside an intact hourly bracket. No interpolation or horizon clamp. */
export function forecastSampleAt(
  weather: Weather,
  minutes: number,
  reference = weather.fetchedAtIso ?? weather.asOfIso,
): ForecastSample | null {
  const origin = absoluteTime(reference);
  if (origin === null || !Number.isFinite(minutes) || minutes < 0) return null;
  const target = origin + minutes * 60_000;
  const samples = allSamples(weather);
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const time = Date.parse(sample.time);
    if (time === target) return sample;
    const next = samples[i + 1];
    if (
      next &&
      time < target &&
      target < Date.parse(next.time) &&
      Date.parse(next.time) - time === HOUR
    )
      return sample;
  }
  return null;
}
export function weatherCoverageMessage(result: OutingWeather): string | null {
  if (result.coverage === "complete") return null;
  return result.coverage === "unavailable"
    ? "Forecast unavailable for this outing. The full trip cannot be assessed."
    : "Forecast covers only part of this outing or has missing readings. The full trip cannot be assessed.";
}
