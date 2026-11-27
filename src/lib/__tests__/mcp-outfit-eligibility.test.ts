// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it, mock } from "bun:test";
import { toddlerRulesApply, toddlerSupportEnabled } from "@/lib/feature-flags";
import { recommend } from "@/lib/recommend";
import { normalizeOutingContext, outingEngineFields } from "@/lib/outing-context";
import { resolveEligibleWardrobe } from "@/lib/wardrobe-eligibility";
import { ageInMonths } from "@/lib/baby-age";
import type { OutingWeather } from "@/lib/outing-weather";
import { normalizeChildPreferences } from "@/lib/child-preferences";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]> = {};

// Fixture database for the assistant tool. Keep the module's full shape:
// mock.module is process-wide in bun.
mock.module("@/lib/mcp/supabase", () => ({
  supabaseForUser: () => ({
    from(table: string) {
      const filters: [string, unknown][] = [];
      const rows = () => (tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v));
      const chain = {
        select: () => chain,
        eq(col: string, val: unknown) {
          filters.push([col, val]);
          // wardrobe_items is awaited straight after .eq(); babies continues to maybeSingle().
          return Object.assign(Promise.resolve({ data: rows(), error: null }), chain);
        },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      };
      return chain;
    },
  }),
  textResult: (value: unknown, structured?: Record<string, unknown>) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    ...(structured ? { structuredContent: structured } : {}),
  }),
  errorResult: (message: string) => ({
    content: [{ type: "text" as const, text: message }],
    isError: true,
  }),
}));

const { default: tool } = await import("@/lib/mcp/tools/get-outfit-recommendation");

const ctx = { isAuthenticated: () => true, getToken: () => "t" } as never;
const run = async (overrides: Row = {}) => {
  const res = (await tool.handler(
    {
      baby_id: "a",
      situation: "walk",
      transport_mode: "sitting-stroller",
      duration_min: 60,
      feels_like_c: -5,
      ...overrides,
    } as never,
    ctx,
  )) as {
    structuredContent: {
      wardrobe: { set_aside: { slug: string }[]; availability_filter_applied: boolean };
      recommendation: {
        transportExtras: { slug: string }[];
        missingHelpfulItems: { slug: string }[];
        notes: string[];
      };
    };
  };
  return res.structuredContent;
};

const baby = {
  id: "a",
  name: "Test",
  dob: "2025-12-01",
  temperature_pref: 3,
  latitude: null,
  longitude: null,
  location_label: null,
};
const item = (slug: string, extra: Row = {}) => ({ baby_id: "a", slug, owned: true, ...extra });

describe("assistant outfit tool", () => {
  it("applies the same eligibility rule as the app, following the rollout switch", async () => {
    tables = {
      babies: [baby],
      wardrobe_items: [
        item("footmuff", { availability: "temporarily_unavailable", insulation: "insulated" }),
        item("rain_cover"),
        item("blanket", { owned: false }),
        item("winter_overall"),
      ],
    };
    const out = await run();
    const extras = out.recommendation.transportExtras.map((e) => e.slug);
    expect(out.wardrobe.availability_filter_applied).toBe(toddlerSupportEnabled());
    // Explicitly unowned is never used, in any rollout state.
    expect(extras).not.toContain("blanket");
    if (toddlerSupportEnabled()) {
      expect(extras).not.toContain("footmuff");
      expect(out.wardrobe.set_aside).toEqual([
        { slug: "footmuff", availability: "temporarily_unavailable" },
      ] as never);
    } else {
      expect(extras).toContain("footmuff");
      expect(out.wardrobe.set_aside).toEqual([]);
    }
  });

  it("an empty eligible wardrobe gets no owned transport extras", async () => {
    tables = { babies: [baby], wardrobe_items: [item("footmuff", { owned: false })] };
    const out = await run();
    expect(out.recommendation.transportExtras).toEqual([]);
    expect(out.recommendation.missingHelpfulItems.map((e) => e.slug)).toContain("footmuff");
  });

  it("tips name a set-aside footmuff as unavailable, an unowned one as missing", async () => {
    tables = {
      babies: [baby],
      wardrobe_items: [item("footmuff", { availability: "temporarily_unavailable" })],
    };
    const away = (await run()).recommendation.notes;
    if (toddlerSupportEnabled()) {
      expect(away).toContain("Your footmuff is marked temporarily unavailable.");
      expect(away.some((n) => n.startsWith("No footmuff"))).toBe(false);
    } else {
      expect(away.some((n) => /footmuff/i.test(n))).toBe(false);
    }
    tables = { babies: [baby], wardrobe_items: [item("footmuff", { owned: false })] };
    expect((await run()).recommendation.notes).toContain(
      "No footmuff in your wardrobe — consider one for cold stroller walks.",
    );
  });

  it("normalizes the outing the same way as Today, without changing outfits", async () => {
    tables = {
      babies: [baby],
      wardrobe_items: [
        "winter_overall",
        "footmuff",
        "blanket",
        "babywearing_cover",
        "warm_hat",
      ].map((s) => item(s)),
    };
    const eligible = resolveEligibleWardrobe(tables.wardrobe_items as never);
    const ageMonths = ageInMonths(baby.dob);
    for (const [situation, transport_mode] of [
      ["walk", "sitting-stroller"],
      ["walk", "carrier"],
      ["walk", undefined],
      ["car", "pram"],
      ["home", "pram"],
    ] as const) {
      const out = await run({ situation, transport_mode, room_temp_c: 21 });
      const expected = recommend({
        feelsLikeC: -5,
        tempPref: 3,
        ...outingEngineFields(normalizeOutingContext({ situation, transportMode: transport_mode })),
        roomTempC: 21,
        durationMin: 60,
        owned: eligible.eligible,
        setAside: eligible.setAside,
        ageMonths,
      });
      expect(out.recommendation).toEqual(expected as never);
    }
  });
});

describe("assistant outfit tool: toddler everyday tops", () => {
  const monthsAgo = (n: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
  };
  const toddler = { ...baby, dob: monthsAgo(20) };
  const slugs = ["long_sleeve_bodysuit", "long_sleeve_top", "pants", "thin_hat", "cotton_socks"];

  it("uses the saved clothing style the same way as Today", async () => {
    for (const clothing_style of ["tops", "bodysuits", "both"] as const)
      for (const easy_toilet_access of [false, true]) {
        tables = {
          babies: [{ ...toddler, clothing_style, easy_toilet_access, nappy_use: "yes" }],
          wardrobe_items: slugs.map((s) => item(s)),
        };
        const out = (await run({ feels_like_c: 19, duration_min: 30 })) as unknown as {
          recommendation: ReturnType<typeof recommend>;
        };
        const eligible = resolveEligibleWardrobe(tables.wardrobe_items as never);
        const today = recommend({
          feelsLikeC: 19,
          tempPref: 3,
          ...outingEngineFields(
            normalizeOutingContext({ situation: "walk", transportMode: "sitting-stroller" }),
          ),
          durationMin: 30,
          owned: eligible.eligible,
          setAside: eligible.setAside,
          ageMonths: ageInMonths(toddler.dob),
          childPreferences: { clothing_style, easy_toilet_access },
        });
        expect(out.recommendation).toEqual(today);
        const base = out.recommendation.babyClothing.find((l) => l.slot === "base")?.slug;
        const wantsTop =
          toddlerSupportEnabled() &&
          (clothing_style === "tops" || (clothing_style === "both" && easy_toilet_access));
        expect(base).toBe(wantsTop ? "long_sleeve_top" : "long_sleeve_bodysuit");
      }
  });
});

describe("assistant outfit tool: wool-leggings answer", () => {
  const monthsAgo = (n: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
  };
  const toddler = { ...baby, dob: monthsAgo(20) };
  const slugs = [
    "long_sleeve_bodysuit",
    "wool_leggings",
    "pants",
    "fleece_layer",
    "winter_overall",
    "thermal_bottom",
  ];

  it("reads saved garment details the same way as Today", async () => {
    for (const leggings_use of ["unknown", "thermal_base", "standalone"]) {
      tables = {
        babies: [toddler],
        wardrobe_items: slugs.map((s) => item(s, s === "wool_leggings" ? { leggings_use } : {})),
      };
      const out = (await run({ feels_like_c: -5, duration_min: 30 })) as unknown as {
        recommendation: ReturnType<typeof recommend>;
      };
      const w = resolveEligibleWardrobe(tables.wardrobe_items as never);
      const today = recommend({
        feelsLikeC: -5,
        tempPref: 3,
        ...outingEngineFields(
          normalizeOutingContext({ situation: "walk", transportMode: "sitting-stroller" }),
        ),
        durationMin: 30,
        owned: w.eligible,
        setAside: w.setAside,
        garmentDetails: w.details,
        ageMonths: ageInMonths(toddler.dob),
        childPreferences: { clothing_style: "both", easy_toilet_access: false },
      });
      expect(out.recommendation).toEqual(today);
      const bottom = out.recommendation.babyClothing.find((l) => l.slot === "bottom")?.slug;
      expect(bottom).toBe(
        leggings_use === "thermal_base" && toddlerSupportEnabled() ? "pants" : "wool_leggings",
      );
      // Owning a thermal bottom never adds it on its own.
      expect(out.recommendation.babyClothing.some((l) => l.slot === "thermal")).toBe(false);
    }
  });
});

describe("assistant outing preparation (T20)", () => {
  const monthsAgo = (n: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
  };
  const toddler = { ...baby, dob: monthsAgo(24) };
  const enabled = toddlerRulesApply(ageInMonths(toddler.dob));
  const t20it = enabled ? it : it.skip;

  t20it("returns the same structured result as Today for equivalent inputs", async () => {
    const realFetch = globalThis.fetch;
    const hour = Math.floor(Date.now() / 3_600_000) * 3600;
    const times = [hour, hour + 3600, hour + 7200, hour + 10800];
    const feels = [18, 2, 18, 18];
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          timezone: "Europe/Helsinki",
          current: {
            time: hour,
            temperature_2m: 18,
            apparent_temperature: 18,
            weather_code: 0,
            wind_speed_10m: 5,
            uv_index: 1,
            cloud_cover: 20,
          },
          hourly: {
            time: times,
            temperature_2m: feels,
            apparent_temperature: feels,
            weather_code: feels.map(() => 0),
            wind_speed_10m: feels.map(() => 5),
            rain: feels.map(() => 0),
            showers: feels.map(() => 0),
            wind_gusts_10m: feels.map(() => 8),
            uv_index: feels.map(() => 1),
            cloud_cover: feels.map(() => 20),
          },
        }),
      }) as Response) as typeof fetch;
    try {
      tables = {
        babies: [{ ...toddler, latitude: 60.17, longitude: 24.94 }],
        wardrobe_items: [
          "long_sleeve_bodysuit",
          "pants",
          "sweater",
          "winter_overall",
          "thin_hat",
          "warm_hat",
          "cotton_socks",
          "wool_socks",
          "mittens",
          "everyday_shoes",
        ].map((s) => item(s)),
      };
      const out = (await run({
        feels_like_c: undefined,
        transport_mode: "none",
        movement: "walking",
        ground: "dry",
        duration_min: 120,
      })) as unknown as {
        recommendation: ReturnType<typeof recommend>;
        outing_weather: OutingWeather;
        weather: { feels_like_c: number; uv_index?: number };
      };
      expect(out.recommendation.outingPreparation?.packing).toContainEqual(
        expect.objectContaining({ slug: "winter_overall", availability: "available" }),
      );
      const w = resolveEligibleWardrobe(tables.wardrobe_items as never);
      const today = recommend({
        feelsLikeC: out.weather.feels_like_c,
        tempPref: 3,
        ...outingEngineFields(
          normalizeOutingContext({
            situation: "walk",
            transportMode: "none",
            movement: "walking",
            ground: "dry",
          }),
        ),
        isRaining: false,
        durationMin: 120,
        outingWeather: out.outing_weather,
        owned: w.eligible,
        setAside: w.setAside,
        garmentDetails: w.details,
        ageMonths: ageInMonths(toddler.dob),
        childPreferences: normalizeChildPreferences(toddler),
        uvIndex: out.weather.uv_index,
        cloudCoverPct: 20,
      });
      expect(out.recommendation).toEqual(today);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("assistant outing weather coverage (T19)", () => {
  for (const incomplete of [false, true]) {
    it(`reports ${incomplete ? "partial" : "complete"} coverage without changing ownership`, async () => {
      const realFetch = globalThis.fetch;
      const hour = Math.floor(Date.now() / 3_600_000) * 3600;
      const times = incomplete
        ? [hour, hour + 7200, hour + 10800]
        : [hour, hour + 3600, hour + 7200, hour + 10800];
      globalThis.fetch = (async () =>
        ({
          ok: true,
          json: async () => ({
            timezone: "Europe/Helsinki",
            current: {
              time: hour,
              temperature_2m: 10,
              apparent_temperature: 10,
              weather_code: 0,
              wind_speed_10m: 0,
            },
            hourly: {
              time: times,
              temperature_2m: times.map(() => 10),
              apparent_temperature: times.map(() => 10),
              weather_code: times.map(() => 0),
              wind_speed_10m: times.map(() => 0),
              rain: times.map(() => 0),
              showers: times.map(() => 0),
            },
          }),
        }) as Response) as typeof fetch;
      try {
        tables = {
          babies: [{ ...baby, latitude: 60.17, longitude: 24.94 }],
          wardrobe_items: [item("pants")],
        };
        const out = (await run({ feels_like_c: undefined, duration_min: 105 })) as unknown as {
          outing_weather: { coverage: string; departure: string; return: string; gaps: unknown[] };
          weather_limitation: string | null;
        };
        expect(out.outing_weather.coverage).toBe(incomplete ? "partial" : "complete");
        expect(
          Date.parse(out.outing_weather.return) - Date.parse(out.outing_weather.departure),
        ).toBe(105 * 60_000);
        if (incomplete) {
          expect(out.outing_weather.gaps.length).toBeGreaterThan(0);
          expect(out.weather_limitation).toContain("part");
        } else {
          expect(out.outing_weather.gaps).toEqual([]);
          expect(out.weather_limitation).toBeNull();
        }
        expect(tables.wardrobe_items).toEqual([item("pants")]);
      } finally {
        globalThis.fetch = realFetch;
      }
    });
  }
});
