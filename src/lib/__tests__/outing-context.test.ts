// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import {
  normalizeOutingContext,
  outingEngineFields,
  parseOutingContext,
  type OutingInput,
} from "../outing-context";
import { recommend, resolveRecommendOuting, type RecommendInput } from "../recommend";
import type { WardrobeSlug } from "../wardrobe-catalog";

describe("legacy home / walk / car", () => {
  it("home and car keep their meaning and drop outdoor-only fields", () => {
    for (const situation of ["home", "car"] as const) {
      expect(
        normalizeOutingContext({
          situation,
          transportMode: "pram",
          movement: "active",
          activity: "playground",
          ground: "wet",
        }),
      ).toEqual({ situation });
    }
  });

  it("a walk with nothing else stated stays unknown", () => {
    expect(normalizeOutingContext({ situation: "walk" })).toEqual({ situation: "walk" });
  });
});

describe("seated stroller / carrier outings", () => {
  it.each([["pram"], ["sitting-stroller"], ["carrier"]] as const)(
    "%s without a stated movement keeps seated/carried",
    (transportMode) => {
      expect(normalizeOutingContext({ situation: "walk", transportMode })).toEqual({
        situation: "walk",
        transport: transportMode,
        movement: "seated",
        movementSource: "transport",
      });
    },
  );
});

describe("walking without transport", () => {
  it("keeps stated walking and no transport", () => {
    const o = normalizeOutingContext({
      situation: "walk",
      transportMode: "none",
      movement: "walking",
    });
    expect(o).toEqual({
      situation: "walk",
      transport: "none",
      movement: "walking",
      movementSource: "stated",
    });
    expect(outingEngineFields(o)).toEqual({ situation: "walk", outing: o });
  });

  it("no transport alone doesn't imply walking", () => {
    expect(normalizeOutingContext({ situation: "walk", transportMode: "none" })).toEqual({
      situation: "walk",
      transport: "none",
    });
  });
});

describe("mixed outings", () => {
  it.each([["sitting-stroller"], ["pram"], ["carrier"]] as const)(
    "mixed + %s keeps both",
    (transportMode) => {
      const o = normalizeOutingContext({ situation: "walk", transportMode, movement: "mixed" });
      expect(o).toEqual({
        situation: "walk",
        transport: transportMode,
        movement: "mixed",
        movementSource: "stated",
      });
      expect(outingEngineFields(o).transportMode).toBe(transportMode);
    },
  );
});

describe("stated values are kept, unstated stay unknown", () => {
  it("a stated movement is never replaced", () => {
    expect(
      normalizeOutingContext({ situation: "walk", transportMode: "carrier", movement: "active" })
        .movement,
    ).toBe("active");
  });

  it("activity and ground are independent and never inferred", () => {
    const wet = normalizeOutingContext({ situation: "walk", activity: "wet_play" });
    expect(wet).toEqual({ situation: "walk", activity: "wet_play" });
    const snow = normalizeOutingContext({ situation: "walk", ground: "snow" });
    expect(snow).toEqual({ situation: "walk", ground: "snow" });
  });

  it("unrecognised or null values are omitted", () => {
    expect(
      normalizeOutingContext({
        situation: "walk",
        transportMode: "bike",
        movement: null,
        activity: "skiing",
        ground: "",
      }),
    ).toEqual({ situation: "walk" });
  });

  it("normalizing twice changes nothing", () => {
    const inputs: OutingInput[] = [
      { situation: "walk", transportMode: "pram" },
      { situation: "walk", transportMode: "none", movement: "walking", ground: "dry" },
      { situation: "walk", transportMode: "carrier", movement: "mixed", activity: "stroll" },
      { situation: "home" },
    ];
    for (const i of inputs) {
      const once = normalizeOutingContext(i);
      const twice = normalizeOutingContext({ ...once, transportMode: once.transport });
      expect(twice).toEqual(once);
      expect(parseOutingContext(JSON.parse(JSON.stringify(once)))).toEqual(once);
    }
  });
});

describe("saved records", () => {
  it("reads older feedback details without new fields", () => {
    expect(
      parseOutingContext({
        situation: "walk",
        activity: "walk", // legacy column holding the situation, not an outdoor activity
        transport_mode: "pram",
        duration_min: 30,
      }),
    ).toEqual({ situation: "walk", transport: "pram", movement: "seated", movementSource: "transport" });
    expect(parseOutingContext({ situation: "car", transport_mode: null })).toEqual({
      situation: "car",
    });
  });

  it("reads new fields when present and rejects records without a situation", () => {
    expect(
      parseOutingContext({
        situation: "walk",
        transport_mode: "none",
        movement: "active",
        outdoor_activity: "playground",
        ground: "wet",
      }),
    ).toEqual({
      situation: "walk",
      transport: "none",
      movement: "active",
      movementSource: "stated",
      activity: "playground",
      ground: "wet",
    });
    expect(parseOutingContext({ transport_mode: "pram" })).toBeNull();
    expect(parseOutingContext(null)).toBeNull();
  });
});

describe("consistency across consumers", () => {
  // Today (phone-kept and signed-in) and the assistant both call
  // normalizeOutingContext; saved records use parseOutingContext; older
  // recommend() callers fall back to resolveRecommendOuting.
  const cases = [
    { situation: "home", transportMode: "sitting-stroller" },
    { situation: "car", transportMode: "pram" },
    { situation: "walk", transportMode: "pram" },
    { situation: "walk", transportMode: "sitting-stroller" },
    { situation: "walk", transportMode: "carrier" },
    { situation: "walk", transportMode: undefined },
  ] as const;

  it.each(cases)("%o normalizes the same everywhere", (c) => {
    const today = normalizeOutingContext(c);
    const assistant = normalizeOutingContext({ situation: c.situation, transportMode: c.transportMode });
    const saved = parseOutingContext({ situation: c.situation, transport_mode: c.transportMode ?? null });
    const engine = outingEngineFields(today);
    const legacy = resolveRecommendOuting({
      situation: engine.situation,
      transportMode: engine.transportMode,
    });
    expect(assistant).toEqual(today);
    expect(saved).toEqual(today);
    expect(legacy).toEqual(today);
    expect(resolveRecommendOuting(engine)).toBe(today);
  });

  it("age never changes the outing", () => {
    const input = { situation: "walk", transportMode: "sitting-stroller" } as const;
    for (const ageMonths of [null, 2, 8, 18, 30]) {
      expect(resolveRecommendOuting({ ...input, ...{ ageMonths } } as never)).toEqual(
        normalizeOutingContext(input),
      );
    }
  });

  it("a context that disagrees with the engine fields is replaced, not trusted", () => {
    const o = normalizeOutingContext({ situation: "walk", transportMode: "carrier" });
    expect(resolveRecommendOuting({ situation: "walk", transportMode: "pram", outing: o })).toEqual(
      normalizeOutingContext({ situation: "walk", transportMode: "pram" }),
    );
    expect(resolveRecommendOuting({ situation: "home", outing: o })).toEqual({ situation: "home" });
  });
});

describe("outfits are unchanged", () => {
  const owned = new Set<WardrobeSlug>([
    "short_sleeve_bodysuit",
    "long_sleeve_bodysuit",
    "pants",
    "sweater",
    "cotton_socks",
    "thin_hat",
    "warm_hat",
    "mittens",
    "fleece_overall",
    "winter_overall",
    "stroller",
    "blanket",
    "footmuff",
    "rain_cover",
    "babywearing_cover",
    "car_seat_blanket",
    "pajamas",
  ]);
  const legacy: Partial<RecommendInput>[] = [];
  for (const feelsLikeC of [-15, -5, 2, 8, 12, 15, 20, 26, 32])
    for (const ageMonths of [null, 2, 8, 18])
      for (const [situation, transportMode] of [
        ["walk", "pram"],
        ["walk", "sitting-stroller"],
        ["walk", "carrier"],
        ["walk", undefined],
        ["car", undefined],
        ["home", undefined],
      ] as const)
        legacy.push({ feelsLikeC, ageMonths, situation, transportMode, isRaining: feelsLikeC === 8 });

  it("passing the outing gives the same recommendation as the old fields", () => {
    for (const l of legacy) {
      const base = { tempPref: 3, owned, durationMin: 60, roomTempC: 21, ...l } as RecommendInput;
      const outing = normalizeOutingContext({
        situation: base.situation,
        transportMode: base.transportMode,
      });
      const viaOuting = recommend({
        ...base,
        transportMode: undefined,
        ...outingEngineFields(outing),
      });
      expect(viaOuting).toEqual(recommend(base));
    }
  });

  it("stated movement, activity and ground don't change outfits yet", () => {
    const base = {
      tempPref: 3,
      owned,
      durationMin: 30,
      feelsLikeC: 4,
      ageMonths: 20,
      isRaining: true,
    } as const;
    const ref = recommend({ ...base, situation: "walk", transportMode: "sitting-stroller" });
    const mixed = normalizeOutingContext({
      situation: "walk",
      transportMode: "sitting-stroller",
      movement: "mixed",
      activity: "playground",
      ground: "wet",
    });
    expect(recommend({ ...base, ...outingEngineFields(mixed) })).toEqual(ref);
  });
});
