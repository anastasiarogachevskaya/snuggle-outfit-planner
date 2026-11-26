// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { resolveOutingWeather, forecastSampleAt } from "../outing-weather";
import { weatherAtMinutesFromNow, type Weather } from "../weather";

function fixture(start = "2026-11-26T10:00:00Z"): Weather {
  return {
    tempC: 10,
    feelsLikeC: 10,
    code: 0,
    condition: "Clear",
    windKph: 0,
    asOfIso: start,
    fetchedAtIso: start,
    sourceTimezone: "Europe/Helsinki",
    hourlyTimeIso: [0, 1, 2, 3].map((i) =>
      new Date(Date.parse(start) + i * 3_600_000).toISOString(),
    ),
    hourlyTempC: [10, -2, 10, 10],
    hourlyFeelsLikeC: [10, -4, 10, 10],
    hourlyCode: [0, 61, 0, 0],
    hourlyWindKph: [0, 25, 0, 0],
    hourlyGustKph: [0, 40, 0, 0],
    hourlyRainMm: [0, 2, 0, 0],
    hourlyShowersMm: [0, 1, 0, 0],
  };
}
describe("T19 complete outing weather", () => {
  it("retains a middle cold/rain spell between similar endpoints", () => {
    const result = resolveOutingWeather(fixture(), 120);
    expect(result.coverage).toBe("complete");
    expect(result.samples.map((s) => s.tempC)).toEqual([10, -2, 10]);
    expect(result.summary.temperatureRangeC).toEqual([-2, 10]);
    expect(result.summary.feelsLikeRangeC).toEqual([-4, 10]);
    expect(result.summary.windRangeKph).toEqual([0, 25]);
    expect(result.summary.maxGustKph).toBe(40);
    expect(result.summary.rainPeriods).toEqual([
      {
        start: "2026-11-26T10:00:00.000Z",
        end: "2026-11-26T11:00:00.000Z",
        rainMm: 2,
        showersMm: 1,
      },
    ]);
    expect(result.gaps).toEqual([]);
  });
  it("keeps exact custom 105 minutes with a 45-minute departure delay", () => {
    const result = resolveOutingWeather(fixture(), 105, 45);
    expect(result.departure).toBe("2026-11-26T10:45:00.000Z");
    expect(result.return).toBe("2026-11-26T12:30:00.000Z");
    expect(result.intervals).toHaveLength(3);
    expect(result.intervals[0].overlapStart).toBe(result.departure);
    expect(result.intervals[2].overlapEnd).toBe(result.return);
    expect(result.intervals[0].endSample.rainMm).toBe(2); // Whole hour sum, not prorated.
  });
  it("crosses midnight without rounding", () => {
    const result = resolveOutingWeather(fixture("2026-11-26T23:30:00Z"), 105, 30);
    expect(result.departure).toBe("2026-11-27T00:00:00.000Z");
    expect(result.return).toBe("2026-11-27T01:45:00.000Z");
    expect(result.coverage).toBe("complete");
  });
  for (const [start, localEnd] of [
    ["2026-03-08T01:30:00-05:00", "04:15"],
    ["2026-11-01T01:30:00-04:00", "02:15"],
  ]) {
    it(`uses elapsed minutes through DST at ${start}`, () => {
      const w = fixture(start);
      w.sourceTimezone = "America/New_York";
      const result = resolveOutingWeather(w, 105);
      expect(Date.parse(result.return ?? "") - Date.parse(result.departure ?? "")).toBe(
        105 * 60_000,
      );
      expect(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(result.return ?? "")),
      ).toBe(localEnd);
      expect(result.coverage).toBe("complete");
    });
  }
  it("is independent of the phone timezone and keeps the location timezone", () => {
    const w = fixture("2026-11-26T10:00:00+02:00");
    const result = resolveOutingWeather(w, 105);
    expect(result.departure).toBe("2026-11-26T08:00:00.000Z");
    expect(result.return).toBe("2026-11-26T09:45:00.000Z");
    expect(result.source.timezone).toBe("Europe/Helsinki");
    expect(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(result.departure ?? "")),
    ).toBe("00");
  });
  it("does not guess zone-less legacy timestamps", () => {
    const w = fixture();
    w.fetchedAtIso = "2026-11-26T10:00";
    expect(resolveOutingWeather(w, 105).coverage).toBe("unavailable");
    expect(resolveOutingWeather(w, 105).gaps[0].reason).toBe("ambiguous_timestamp");
    expect(forecastSampleAt(w, 60)).toBeNull();
  });
  it("never claims complete coverage across a missing hour", () => {
    const w = fixture();
    w.hourlyTimeIso.splice(1, 1);
    const result = resolveOutingWeather(w, 180);
    expect(result.coverage).toBe("partial");
    expect(result.gaps.some((g) => g.reason === "missing_hour")).toBe(true);
    expect(forecastSampleAt(w, 90)).toBeNull();
  });
  for (const [field, key] of [
    ["tempC", "hourlyTempC"],
    ["windKph", "hourlyWindKph"],
    ["rainMm", "hourlyRainMm"],
    ["showersMm", "hourlyShowersMm"],
  ] as const) {
    it(`keeps absent ${field} distinct from zero`, () => {
      const w = fixture();
      const values = w[key];
      if (!values) throw new Error("fixture missing");
      values[1] = null;
      const result = resolveOutingWeather(w, 60);
      expect(result.coverage).toBe("partial");
      expect(result.gaps[0].fields).toContain(field);
      expect(result.samples[1][field]).toBeNull();
    });
  }
  it("records absent optional gust without inventing zero", () => {
    const w = fixture();
    delete w.hourlyGustKph;
    const result = resolveOutingWeather(w, 60);
    expect(result.coverage).toBe("complete");
    expect(result.intervals[0].missingFields).toContain("gustKph");
    expect(result.summary.maxGustKph).toBeNull();
  });
  it("preserves valid coverage and identifies the exact beyond-horizon remainder", () => {
    const result = resolveOutingWeather(fixture(), 240);
    expect(result.coverage).toBe("partial");
    expect(result.intervals).toHaveLength(3);
    expect(result.gaps).toEqual([
      {
        start: "2026-11-26T13:00:00.000Z",
        end: "2026-11-26T14:00:00.000Z",
        reason: "outside_forecast",
        fields: [],
      },
    ]);
    expect(forecastSampleAt(fixture(), 181)).toBeNull();
    expect(weatherAtMinutesFromNow(fixture(), 181)).toBeNull();
  });
  it("returns unavailable when departure is entirely beyond coverage", () => {
    const result = resolveOutingWeather(fixture(), 105, 240);
    expect(result.coverage).toBe("unavailable");
    expect(result.samples).toEqual([]);
  });
  it("does not substitute missing future wind or temperature from current readings", () => {
    const w = fixture();
    delete w.hourlyWindKph;
    expect(weatherAtMinutesFromNow(w, 60)).toBeNull();
  });
  it("bounds work for a million-minute custom outing, retaining its exact end", () => {
    const result = resolveOutingWeather(fixture(), 1_000_000);
    expect(result.intervals).toHaveLength(3);
    expect(result.coverage).toBe("partial");
    expect(Date.parse(result.return ?? "") - Date.parse(result.departure ?? "")).toBe(
      1_000_000 * 60_000,
    );
  });
  it("empty hourly data is unavailable, never covered by current", () => {
    const w = fixture();
    w.hourlyTimeIso = [];
    expect(resolveOutingWeather(w, 105).coverage).toBe("unavailable");
    expect(forecastSampleAt(w, 105)).toBeNull();
  });
});
