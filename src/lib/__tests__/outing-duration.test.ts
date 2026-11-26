// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import {
  durationPresets,
  parseDurationMinutes,
  outingEndOffset,
  outingEndTime,
} from "../outing-duration";
import { parseStoredOutingAnswers } from "../today-outing";
import { feelsLikeAtMinutesFromNow, type Weather } from "../weather";
import { recommend } from "../recommend";
import type { WardrobeSlug } from "../wardrobe-catalog";

describe("T18 duration policy", () => {
  for (const activity of ["stroll", "wet_play", "snow_play"] as const) {
    it(`${activity} offers 15/30/60`, () => {
      expect(durationPresets("walk", "walking", activity)).toEqual([15, 30, 60]);
    });
  }
  it("playground offers 30/60/90", () => {
    expect(durationPresets("walk", "active", "playground")).toEqual([30, 60, 90]);
  });
  for (const movement of ["seated", "mixed"] as const) {
    it(`${movement} overrides activity choices`, () => {
      for (const activity of ["stroll", "playground", "wet_play", "snow_play"] as const)
        expect(durationPresets("walk", movement, activity)).toEqual([15, 30, 60, 90]);
    });
  }
  it("unspecified outdoors uses general choices", () => {
    expect(durationPresets("walk")).toEqual([15, 30, 60, 90]);
  });
  it("car offers 15/30/60/120; home needs none", () => {
    expect(durationPresets("car")).toEqual([15, 30, 60, 120]);
    expect(durationPresets("home")).toEqual([]);
  });
  for (const minutes of [30, 60, 90, 105]) {
    it(`preserves ${minutes} through validation and session persistence`, () => {
      expect(parseDurationMinutes(String(minutes))).toBe(minutes);
      expect(parseStoredOutingAnswers(JSON.stringify({ duration: minutes })).duration).toBe(
        minutes,
      );
    });
  }
  for (const raw of ["", " ", "0", "-1", "1.5", "abc", "1e2", "Infinity", "105min"]) {
    it(`rejects ${JSON.stringify(raw)} without a replacement duration`, () => {
      expect(parseDurationMinutes(raw)).toBeNull();
    });
  }
  it("invalid stored duration stays absent so only a new outing defaults to 30", () => {
    for (const duration of [0, -1, 1.5, "105", null])
      expect(parseStoredOutingAnswers(JSON.stringify({ duration }))).toEqual({});
    expect(parseStoredOutingAnswers(null).duration ?? 30).toBe(30);
  });
  it("keeps 105 across session context and transport changes", () => {
    for (const movement of ["walking", "seated", "mixed"] as const) {
      for (const toddlerTransport of ["none", "carrier", "sitting-stroller"] as const) {
        const saved = parseStoredOutingAnswers(
          JSON.stringify({ duration: 105, movement, toddlerTransport, activity: "stroll" }),
        );
        durationPresets("walk", saved.movement, saved.activity);
        durationPresets("car");
        durationPresets("home");
        expect(saved.duration).toBe(105);
      }
    }
  });
  it("105-minute end and requested forecast offset agree across midnight", () => {
    const start = "2026-11-26T23:30:00Z";
    expect(outingEndOffset(105)).toBe(105);
    expect(outingEndTime(start, 105).toISOString()).toBe("2026-11-27T01:15:00.000Z");
    expect(outingEndOffset(105, 60)).toBe(165);
    expect(outingEndTime(start, 105, 60).toISOString()).toBe("2026-11-27T02:15:00.000Z");
    const weather: Weather = {
      tempC: 10,
      feelsLikeC: 10,
      windKph: 0,
      code: 0,
      condition: "Clear",
      asOfIso: start,
      hourlyTimeIso: ["2026-11-27T00:00Z", "2026-11-27T01:00Z", "2026-11-27T02:00Z"],
      hourlyFeelsLikeC: [8, 6, 4],
    };
    expect(feelsLikeAtMinutesFromNow(weather, outingEndOffset(105))).toBe(6);
    expect(feelsLikeAtMinutesFromNow(weather, outingEndOffset(105, 60))).toBe(4);
  });
  it("custom duration reuses existing >=90 warmth threshold, not a new adjustment", () => {
    const input = {
      feelsLikeC: -4,
      tempPref: 3,
      situation: "walk" as const,
      owned: new Set<WardrobeSlug>(),
    };
    expect(recommend({ ...input, durationMin: 105 })).toEqual(
      recommend({ ...input, durationMin: 90 }),
    );
  });
});
