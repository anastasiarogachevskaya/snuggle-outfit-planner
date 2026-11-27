// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { recommend, type RecommendInput } from "../../recommend";
import { resolveOutingWeather } from "../../outing-weather";
import type { Weather } from "../../weather";
import { isRainingCode } from "../../weather";
import { normalizeOutingContext } from "../../outing-context";
import { toddlerRulesApply } from "../../feature-flags";
import type { WardrobeSlug } from "../../wardrobe-catalog";
import type { GarmentDetails } from "../../garment-details";
import { idealOutfitFrom } from "../warmth";

const START = "2026-11-26T10:00:00Z";
const owned = () =>
  new Set<WardrobeSlug>([
    "long_sleeve_bodysuit",
    "long_sleeve_top",
    "pants",
    "shorts",
    "sweater",
    "fleece_overall",
    "winter_overall",
    "thin_hat",
    "warm_hat",
    "sun_hat",
    "mittens",
    "cotton_socks",
    "wool_socks",
    "everyday_shoes",
    "rain_boots",
    "rain_overall",
    "waterproof_jacket",
    "rain_pants",
    "blanket",
    "footmuff",
    "rain_cover",
  ]);

function fixture(
  feels: number[],
  codes: number[] = feels.map(() => 0),
  rain: number[] = feels.map(() => 0),
): Weather {
  return {
    tempC: feels[0]!,
    feelsLikeC: feels[0]!,
    windKph: 5,
    code: codes[0]!,
    condition: "Clear",
    uvIndex: 1,
    cloudCoverPct: 20,
    asOfIso: START,
    fetchedAtIso: START,
    sourceTimezone: "Europe/Helsinki",
    hourlyTimeIso: feels.map((_, i) => new Date(Date.parse(START) + i * 3_600_000).toISOString()),
    hourlyFeelsLikeC: feels,
    hourlyTempC: feels,
    hourlyCode: codes,
    hourlyWindKph: feels.map(() => 5),
    hourlyRainMm: rain,
    hourlyShowersMm: rain.map(() => 0),
    hourlyGustKph: feels.map(() => 8),
    hourlyUv: feels.map(() => 1),
    hourlyCloudPct: feels.map(() => 20),
  };
}

function baseInput(overrides: Partial<RecommendInput> = {}): RecommendInput {
  return {
    feelsLikeC: 18,
    tempPref: 3,
    situation: "walk",
    durationMin: 120,
    ageMonths: 24,
    owned: owned(),
    isRaining: false,
    outing: normalizeOutingContext({
      situation: "walk",
      transportMode: "none",
      movement: "walking",
      ground: "dry",
    }),
    childPreferences: { clothing_style: "both", easy_toilet_access: false },
    ...overrides,
  };
}

function prepare(
  feels: number[],
  options: {
    codes?: number[];
    rain?: number[];
    input?: Partial<RecommendInput>;
    duration?: number;
    weather?: (weather: Weather) => void;
  } = {},
) {
  const codes = options.codes ?? feels.map(() => 0);
  const weather = fixture(feels, codes, options.rain);
  options.weather?.(weather);
  const input = baseInput({
    feelsLikeC: feels[0],
    isRaining: isRainingCode(codes[0]!),
    durationMin: options.duration ?? 120,
    ...options.input,
  });
  const resolved = resolveOutingWeather(weather, input.durationMin ?? 120);
  return recommend({ ...input, outingWeather: resolved });
}

const toddlerEnabled = toddlerRulesApply(24);
const gatedIt = toddlerEnabled ? it : it.skip;

describe("T20 outing weather preparation", () => {
  gatedIt("finds a cold spell in the middle even when departure and return are similar", () => {
    const rec = prepare([18, 2, 18, 18]);
    const prep = rec.outingPreparation!;
    expect(prep.coverage).toBe("complete");
    expect(prep.evaluated.map((p) => p.feelsLikeC)).toEqual([2, 18]);
    expect(prep.packing.filter((p) => p.slug === "winter_overall")).toHaveLength(1);
    expect(prep.packing.find((p) => p.slug === "winter_overall")).toMatchObject({
      availability: "available",
    });
    expect(rec.babyClothing.some((l) => l.slug === "winter_overall")).toBe(false);
    expect(prep.changes.some((c) => c.to?.slug === "winter_overall")).toBe(true);
  });

  gatedIt("finds possible rain in the middle without inventing an exact start", () => {
    const details = new Map<WardrobeSlug, Partial<GarmentDetails>>([
      ["rain_overall", { waterproof: "yes" }],
    ]);
    const rec = prepare([12, 12, 12], {
      codes: [0, 61, 0],
      rain: [0, 2, 0],
      input: { garmentDetails: details },
    });
    const prep = rec.outingPreparation!;
    const rain = prep.packing.find((p) => p.slug === "rain_overall");
    expect(rain).toMatchObject({ availability: "available", protection: "confirmed" });
    expect(rain?.periods).toHaveLength(1);
    expect(prep.changes.find((c) => c.to?.slug === "rain_overall")?.reasons).toContain("rain");
    expect(prep.evaluated[0]).toMatchObject({
      start: "2026-11-26T10:00:00.000Z",
      end: "2026-11-26T11:00:00.000Z",
      raining: true,
      rainMm: 2,
      showersMm: 0,
    });
    expect(prep.spareSuggestion).not.toBeNull();
    expect(rec.babyClothing.some((l) => l.slug === "rain_overall")).toBe(false);
  });

  gatedIt("keeps unconfirmed later protection visible beside an owned packing item", () => {
    const rec = prepare([12, 12, 12], { codes: [0, 61, 0], rain: [0, 1, 0] });
    expect(rec.outingPreparation!.packing.find((p) => p.slug === "rain_overall")).toMatchObject({
      availability: "available",
      protection: "unconfirmed",
    });
    expect(rec.outingPreparation!.protection.find((p) => p.slug === "rain_overall")).toMatchObject({
      status: "unconfirmed",
    });
  });

  gatedIt("never combines a cold instant with rain from a different instant", () => {
    const rec = prepare([18, 2, 12, 18], {
      codes: [0, 0, 61, 0],
      rain: [0, 0, 1, 0],
      duration: 180,
    });
    const prep = rec.outingPreparation!;
    expect(prep.evaluated.map((p) => [p.feelsLikeC, p.raining])).toEqual([
      [2, false],
      [12, true],
      [18, false],
    ]);
    expect(prep.packing.some((p) => p.slug === "winter_overall")).toBe(true);
    expect(prep.packing.some((p) => p.slug === "rain_overall")).toBe(true);
    expect(prep.protection.some((p) => p.slug === "winter_overall")).toBe(false);
  });

  gatedIt("explains later warming as removal/replacement, not a second stacked outfit", () => {
    const rec = prepare([2, 18, 18]);
    const prep = rec.outingPreparation!;
    expect(prep.changes.some((c) => c.kind === "remove" && c.from?.slug === "winter_overall")).toBe(
      true,
    );
    expect(prep.packing.some((p) => p.slug === "winter_overall")).toBe(false);
    expect(rec.babyClothing.some((l) => l.slug === "winter_overall")).toBe(true);
    expect(prep.changes.some((c) => c.kind === "replace" && c.to?.slug === "thin_hat")).toBe(true);
  });

  gatedIt("deduplicates repeated needs and retains every relevant period", () => {
    const rec = prepare([18, 2, 2, 18], { duration: 180 });
    const prep = rec.outingPreparation!;
    expect(prep.packing.filter((p) => p.slug === "winter_overall")).toHaveLength(1);
    expect(prep.packing.find((p) => p.slug === "winter_overall")?.periods).toHaveLength(2);
    expect(prep.changes.filter((c) => c.to?.slug === "winter_overall")).toHaveLength(1);
    expect(prep.changes.find((c) => c.to?.slug === "winter_overall")?.periods).toHaveLength(2);
  });

  gatedIt(
    "preserves T15A: later cold rain packs the warm layer, never an overlapping shell",
    () => {
      const details = new Map<WardrobeSlug, Partial<GarmentDetails>>([
        ["rain_overall", { waterproof: "yes" }],
      ]);
      const rec = prepare([18, 2, 18], {
        codes: [0, 61, 0],
        rain: [0, 1, 0],
        input: { garmentDetails: details },
      });
      const prep = rec.outingPreparation!;
      expect(prep.packing.some((p) => p.slug === "winter_overall")).toBe(true);
      expect(prep.packing.some((p) => p.slug === "rain_overall")).toBe(false);
      expect(prep.packing.find((p) => p.slug === "winter_overall")).toMatchObject({
        protection: "unconfirmed",
        notLayeredOver: true,
      });
      expect(prep.protection.find((p) => p.slug === "winter_overall")).toMatchObject({
        status: "unconfirmed",
        notLayeredOver: true,
      });
    },
  );

  for (const availability of ["temporarily_unavailable", "outgrown"] as const) {
    gatedIt(`retains ${availability} on a later needed garment`, () => {
      const wardrobe = owned();
      wardrobe.delete("winter_overall");
      const rec = prepare([18, 2, 18], {
        input: {
          owned: wardrobe,
          setAside: new Map([["winter_overall", availability]]),
        },
      });
      expect(rec.outingPreparation!.packing.find((p) => p.slug === "winter_overall")).toMatchObject(
        { availability },
      );
      expect(rec.babyClothing.some((l) => l.slug === "winter_overall")).toBe(false);
    });
  }

  gatedIt("uses only intact intervals and keeps unknown later weather explicit", () => {
    const rec = prepare([18, 2, 18, 18], {
      duration: 180,
      weather: (weather) => {
        weather.hourlyTimeIso.splice(2, 1);
        weather.hourlyFeelsLikeC.splice(2, 1);
        weather.hourlyTempC?.splice(2, 1);
        weather.hourlyCode?.splice(2, 1);
        weather.hourlyWindKph?.splice(2, 1);
        weather.hourlyRainMm?.splice(2, 1);
        weather.hourlyShowersMm?.splice(2, 1);
        weather.hourlyUv?.splice(2, 1);
        weather.hourlyCloudPct?.splice(2, 1);
      },
    });
    const prep = rec.outingPreparation!;
    expect(prep.coverage).toBe("partial");
    expect(prep.evaluated).toHaveLength(1);
    expect(prep.notes.length).toBeGreaterThan(0);
  });

  gatedIt("returns departure-only preparation when no forecast is covered", () => {
    const rec = prepare([18, 18], {
      weather: (weather) => {
        weather.hourlyTimeIso = [];
      },
    });
    const prep = rec.outingPreparation!;
    expect(prep.coverage).toBe("unavailable");
    expect(prep.evaluated).toEqual([]);
    expect(prep.packing).toEqual([]);
    expect(prep.notes.length).toBeGreaterThan(0);
  });

  gatedIt("never adds packed warmth to Wear now or treats worn socks as a spare", () => {
    const input = baseInput({ feelsLikeC: 18 });
    const rec = prepare([18, 2, 18], { codes: [0, 61, 0], rain: [0, 1, 0] });
    const { outingPreparation: _prep, ...wearNow } = rec;
    expect(wearNow).toEqual(recommend(input));
    expect(idealOutfitFrom(rec).outer).toBe("none");
    expect(rec.babyClothing.some((l) => l.slug === "winter_overall")).toBe(false);
    expect(rec.accessories.some((a) => a.slug === "wool_socks")).toBe(false);
    expect(rec.outingPreparation!.spareSuggestion).not.toBeNull();
    expect(
      rec.outingPreparation!.packing.some((p) => p.slug === "cotton_socks" || p.slug === "pants"),
    ).toBe(false);
  });

  gatedIt("keeps the departure UV clothing and safety rules unchanged", () => {
    const input = baseInput({ feelsLikeC: 24, uvIndex: 8, cloudCoverPct: 90 });
    const rec = prepare([24, 24, 24], { input });
    const { outingPreparation: _prep, ...wearNow } = rec;
    expect(wearNow).toEqual(recommend(input));
    expect(rec.accessories.some((a) => a.slug === "sun_hat")).toBe(true);
    expect(rec.safetyAdvice.length).toBeGreaterThan(0);
  });

  gatedIt("offers only a quantity-neutral spare suggestion for explicitly wet ground", () => {
    const input = baseInput({
      outing: normalizeOutingContext({
        situation: "walk",
        transportMode: "none",
        movement: "walking",
        ground: "wet",
      }),
    });
    const rec = prepare([12, 12, 12], { input });
    expect(rec.outingPreparation!.evaluated.every((p) => !p.raining)).toBe(true);
    expect(rec.outingPreparation!.spareSuggestion).not.toBeNull();
    expect(
      rec.outingPreparation!.packing.some((p) => p.slug === "cotton_socks" || p.slug === "pants"),
    ).toBe(false);
  });

  gatedIt("keeps later transport equipment separate from worn clothing", () => {
    const rec = prepare([18, 2, 18], {
      input: {
        outing: normalizeOutingContext({
          situation: "walk",
          transportMode: "sitting-stroller",
          movement: "mixed",
          ground: "dry",
        }),
        transportMode: "sitting-stroller",
      },
    });
    const footmuff = rec.outingPreparation!.packing.find((p) => p.slug === "footmuff");
    expect(footmuff).toMatchObject({ category: "transport", availability: "available" });
    expect(rec.babyClothing.some((l) => l.slug === "footmuff")).toBe(false);
    expect(rec.transportExtras.some((l) => l.slug === "footmuff")).toBe(false);
  });

  it("preserves infant, switch-off, home and car outputs exactly", () => {
    for (const ageMonths of [8, 24]) {
      const input = baseInput({ ageMonths, feelsLikeC: 18 });
      const weather = resolveOutingWeather(fixture([18, 2, 18]), 120);
      const rec = recommend({ ...input, outingWeather: weather });
      if (ageMonths === 8 || !toddlerEnabled) {
        expect(rec).toEqual(recommend(input));
        expect(rec.outingPreparation).toBeUndefined();
      }
    }
    for (const situation of ["home", "car"] as const) {
      const input = baseInput({ situation, outing: normalizeOutingContext({ situation }) });
      expect(
        recommend({ ...input, outingWeather: resolveOutingWeather(fixture([18, 2, 18]), 120) }),
      ).toEqual(recommend(input));
    }
  });
});
