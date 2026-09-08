// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect, afterEach } from "bun:test";
import { fetchWeather, feelsLikeAtMinutesFromNow } from "../weather";

const realFetch = globalThis.fetch;

type Current = Record<string, unknown>;
type Hourly = Record<string, unknown>;

let lastUrl = "";

function stubFetch(current: Current, ok = true, hourly?: Hourly) {
  lastUrl = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    lastUrl = String(input);
    return {
      ok,
      json: async () => ({ current, hourly }),
    } as Response;
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

const SAMPLE: Current = {
  time: "2026-01-15T10:00",
  temperature_2m: 11.4,
  apparent_temperature: 8.2,
  wind_speed_10m: 17,
  weather_code: 61,
  uv_index: 2.5,
};

describe("fetchWeather", () => {
  it("requests Open-Meteo with the expected params", async () => {
    stubFetch(SAMPLE);
    await fetchWeather(60.17, 24.94);
    const url = new URL(lastUrl);
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("60.17");
    expect(url.searchParams.get("longitude")).toBe("24.94");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
    expect(url.searchParams.get("current")).toBe(
      "temperature_2m,apparent_temperature,wind_speed_10m,weather_code,uv_index",
    );
    expect(url.searchParams.get("hourly")).toBe("apparent_temperature");
    expect(url.searchParams.get("forecast_days")).toBe("2");
    expect(url.searchParams.get("timezone")).toBe("auto");
  });

  it("maps the response onto the Weather shape", async () => {
    stubFetch(SAMPLE);
    const w = await fetchWeather(1, 2);
    expect(w).toEqual({
      tempC: 11.4,
      feelsLikeC: 8.2,
      windKph: 17,
      code: 61,
      condition: "Rain",
      uvIndex: 2.5,
      asOfIso: "2026-01-15T10:00",
      hourlyTimeIso: [],
      hourlyFeelsLikeC: [],
    });
  });

  it("omits uvIndex when the API does not return one", async () => {
    stubFetch({ ...SAMPLE, uv_index: null });
    const w = await fetchWeather(1, 2);
    expect(w.uvIndex).toBeUndefined();
  });

  it("keeps a zero UV index", async () => {
    stubFetch({ ...SAMPLE, uv_index: 0 });
    const w = await fetchWeather(1, 2);
    expect(w.uvIndex).toBe(0);
  });

  it("throws when the response is not ok", async () => {
    stubFetch(SAMPLE, false);
    await expect(fetchWeather(1, 2)).rejects.toThrow("weather fetch failed");
  });
});

describe("feelsLikeAtMinutesFromNow", () => {
  it("finds the closest hourly value ahead of now", async () => {
    stubFetch(SAMPLE, true, {
      time: ["2026-01-15T10:00", "2026-01-15T11:00", "2026-01-15T12:00"],
      apparent_temperature: [8.2, 10.5, 12.8],
    });
    const w = await fetchWeather(1, 2);
    expect(feelsLikeAtMinutesFromNow(w, 60)).toBe(10.5);
    expect(feelsLikeAtMinutesFromNow(w, 120)).toBe(12.8);
    // 50 minutes rounds to the 11:00 bucket, not 10:00 or 12:00.
    expect(feelsLikeAtMinutesFromNow(w, 50)).toBe(10.5);
  });

  it("returns null when there is no hourly data", async () => {
    stubFetch(SAMPLE);
    const w = await fetchWeather(1, 2);
    expect(feelsLikeAtMinutesFromNow(w, 60)).toBeNull();
  });
});

describe("weather code descriptions", () => {
  const cases: [number, string][] = [
    [0, "Clear"],
    [1, "Mostly clear"],
    [2, "Mostly clear"],
    [3, "Overcast"],
    [45, "Foggy"],
    [48, "Foggy"],
    [51, "Drizzle"],
    [57, "Drizzle"],
    [61, "Rain"],
    [82, "Rain"],
    [71, "Snow"],
    [86, "Snow"],
    [95, "Thunderstorm"],
    [99, "Thunderstorm"],
    [4, "Cloudy"],
  ];

  for (const [code, condition] of cases) {
    it(`code ${code} → ${condition}`, async () => {
      stubFetch({ ...SAMPLE, weather_code: code });
      const w = await fetchWeather(1, 2);
      expect(w.condition).toBe(condition);
    });
  }
});
