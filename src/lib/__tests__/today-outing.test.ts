// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { recommend } from "@/lib/recommend";
import { toddlerSupportEnabled } from "@/lib/feature-flags";
import { outingEngineFields } from "@/lib/outing-context";
import {
  todayOutingContext,
  todayOutingControlsShown,
  type TodayOutingAnswers,
} from "@/lib/today-outing";
import { resolveEligibleWardrobe, type WardrobeItemRow } from "@/lib/wardrobe-eligibility";

// Signed-in fixture: rows as fetchWardrobeItems returns them.
const rows = (over: Record<string, Partial<WardrobeItemRow>> = {}): WardrobeItemRow[] =>
  [
    "bodysuit_long",
    "leggings",
    "sweater",
    "jacket",
    "socks",
    "everyday_shoes",
    "rain_boots",
    "rain_overall",
    "footmuff",
  ].map((slug) => ({ slug, owned: true, availability: "available", ...over[slug] }));

function run(
  a: TodayOutingAnswers,
  ageMonths: number,
  opts: { rows?: WardrobeItemRow[]; raining?: boolean; enabled?: boolean; feels?: number } = {},
) {
  const w = resolveEligibleWardrobe(opts.rows ?? rows(), {
    availabilityFilter: opts.enabled ?? true,
  });
  const outing = todayOutingContext(a, ageMonths, opts.enabled ?? true);
  return {
    outing,
    rec: recommend({
      feelsLikeC: opts.feels ?? 8,
      tempPref: 0,
      ...outingEngineFields(outing),
      isRaining: a.situation === "walk" ? (opts.raining ?? false) : undefined,
      roomTempC: a.situation === "home" ? 21 : undefined,
      durationMin: 30,
      owned: w.eligible,
      setAside: w.setAside,
      garmentDetails: w.details,
      ageMonths,
    }),
  };
}
const walk = (x: Partial<TodayOutingAnswers> = {}): TodayOutingAnswers => ({
  situation: "walk",
  transportMode: "sitting-stroller",
  ...x,
});

// Engine assertions need the toddler rules compiled in; the context tests pass a switch value.
const engineIt = toddlerSupportEnabled() ? it : it.skip;

describe("Today toddler outing controls (T17)", () => {
  it("shows controls only for 12–35 months with the switch on", () => {
    expect(todayOutingControlsShown(11, true)).toBe(false);
    expect(todayOutingControlsShown(12, true)).toBe(true);
    expect(todayOutingControlsShown(35, true)).toBe(true);
    expect(todayOutingControlsShown(36, true)).toBe(false);
    expect(todayOutingControlsShown(null, true)).toBe(false);
    expect(todayOutingControlsShown(24, false)).toBe(false);
  });

  it("keeps answers independent and never infers them", () => {
    expect(todayOutingContext(walk({ toddlerTransport: "none" }), 24, true)).toEqual({
      situation: "walk",
      transport: "none",
    });
    expect(todayOutingContext(walk({ activity: "wet_play" }), 24, true).ground).toBeUndefined();
    expect(
      todayOutingContext(walk({ movement: "walking", toddlerTransport: "carrier" }), 24, true),
    ).toMatchObject({ movement: "walking", movementSource: "stated", transport: "carrier" });
    // Unstated movement with a stroller keeps the legacy seated meaning.
    expect(todayOutingContext(walk(), 24, true)).toMatchObject({
      movement: "seated",
      movementSource: "transport",
    });
  });

  it("ignores toddler answers for infants and switch-off (legacy context)", () => {
    const a = walk({
      movement: "walking",
      toddlerTransport: "none",
      ground: "wet",
      activity: "playground",
    });
    const legacy = {
      situation: "walk",
      movement: "seated",
      movementSource: "transport",
      transport: "sitting-stroller",
    };
    expect(todayOutingContext(a, 8, true)).toEqual(legacy);
    expect(todayOutingContext(a, 24, false)).toEqual(legacy);
  });

  it("drops retained outdoor answers for home and car", () => {
    const answers = {
      movement: "active",
      toddlerTransport: "none",
      ground: "wet",
      activity: "wet_play",
    } as const;
    for (const situation of ["home", "car"] as const) {
      const r = run({ situation, transportMode: "sitting-stroller", ...answers }, 24);
      const plain = run({ situation, transportMode: "sitting-stroller" }, 24);
      expect(r.outing).toEqual({ situation });
      expect(r.rec).toEqual(plain.rec);
      expect(r.rec?.footwear).toBeUndefined();
    }
  });

  engineIt("walking without transport adds footwear apart from socks", () => {
    const { rec } = run(walk({ movement: "walking", toddlerTransport: "none", ground: "dry" }), 24);
    expect(rec?.footwear?.selected).toBe("everyday_shoes");
    expect(rec?.accessories.filter((a) => a.slug === "everyday_shoes")).toHaveLength(1);
    expect(rec?.transportExtras).toHaveLength(0);
  });

  engineIt(
    "wet ground without rain asks for waterproof footwear and leg cover, never inferred from rain",
    () => {
      const { rec } = run(
        walk({ movement: "walking", toddlerTransport: "none", ground: "wet" }),
        24,
      );
      expect(rec?.footwear?.selected).toBe("rain_boots");
      expect(rec?.footwear?.waterproofingMet).toBe(false); // unstated → unconfirmed
      expect(rec?.rainProtection?.reasons).toEqual(["wet_ground"]);
      const dry = run(walk({ movement: "walking", toddlerTransport: "none" }), 24, {
        raining: true,
      });
      expect(dry.rec?.footwear?.ground).not.toBe("wet");
    },
  );

  engineIt("rain layers appear once", () => {
    const { rec } = run(walk({ movement: "walking", toddlerTransport: "none" }), 24, {
      raining: true,
    });
    const slugs = rec!.babyClothing.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  engineIt("mixed with stroller keeps riding extras separate and the riding-warmth note", () => {
    const { rec } = run(walk({ movement: "mixed", toddlerTransport: "sitting-stroller" }), 24, {
      feels: -5,
    });
    expect(rec?.walkingWarmth?.transport).toBe("sitting-stroller");
    expect(rec?.walkingWarmth?.notJudged).toContain("riding_warmth_of_walking_outfit");
    expect(rec?.babyClothing.some((l) => l.slug === "footmuff")).toBe(false);
  });

  it("seated keeps no walking footwear", () => {
    const { rec } = run(walk({ movement: "seated", toddlerTransport: "sitting-stroller" }), 24);
    expect(rec?.footwear).toBeUndefined();
  });

  engineIt("availability edits refresh footwear and rain choices", () => {
    const a = walk({ movement: "walking", toddlerTransport: "none", ground: "wet" });
    const away = run(a, 24, {
      raining: true,
      rows: rows({
        rain_boots: { availability: "outgrown" },
        rain_overall: { availability: "temporarily_unavailable" },
      }),
    });
    expect(away.rec?.footwear?.selected).not.toBe("rain_boots");
    expect(
      away.rec?.rainProtection?.garments.find((g) => g.slug === "rain_overall")?.owned ?? false,
    ).toBe(false);
    const back = run(a, 24, { raining: true });
    expect(back.rec?.footwear?.selected).toBe("rain_boots");
  });
});
