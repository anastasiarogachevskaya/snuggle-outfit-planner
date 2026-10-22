// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, it } from "bun:test";
import { recommend, transportExtraCandidates, type RecommendInput } from "../../recommend";
import { compareOutfits, idealOutfitFrom, EMPTY_OUTFIT } from "../warmth";

describe("transportExtraCandidates", () => {
  it("lists stroller gear for pram and sitting stroller", () => {
    expect(transportExtraCandidates("walk", "pram")).toEqual([
      "rain_cover",
      "footmuff",
      "blanket",
    ]);
    expect(transportExtraCandidates("walk", "sitting-stroller")).toEqual([
      "rain_cover",
      "footmuff",
      "blanket",
    ]);
  });

  it("lists carrier gear for a carrier", () => {
    expect(transportExtraCandidates("walk", "carrier")).toEqual(["babywearing_cover"]);
  });

  it("lists car gear for car trips", () => {
    expect(transportExtraCandidates("car")).toEqual(["blanket", "car_seat_blanket"]);
  });

  it("lists nothing at home", () => {
    expect(transportExtraCandidates("home")).toEqual([]);
  });
});

const base: RecommendInput = {
  feelsLikeC: 18,
  tempPref: 3,
  situation: "walk",
  transportMode: "pram",
  owned: new Set(["rain_cover", "footmuff", "blanket"]),
  ageMonths: 8,
};

describe("optional transport extras", () => {
  it("never recommends or offers a blanket for a +6°C carrier walk", () => {
    for (const durationMin of [30, 60, 90]) {
      for (const tempPref of [1, 3, 5]) {
        const rec = recommend({
          ...base,
          feelsLikeC: 6,
          transportMode: "carrier",
          durationMin,
          tempPref,
          owned: new Set(["blanket", "babywearing_cover"]),
        });
        const allExtras = [
          ...rec.transportExtras,
          ...rec.missingHelpfulItems,
          ...rec.optionalTransportExtras,
        ];
        expect(allExtras.map((e) => e.slug)).not.toContain("blanket");
      }
    }
  });

  it("keeps a carrier cover, not a blanket, for colder carrier walks", () => {
    const rec = recommend({
      ...base,
      feelsLikeC: -5,
      transportMode: "carrier",
      owned: new Set(["blanket", "babywearing_cover"]),
    });
    expect(rec.transportExtras.map((e) => e.slug)).toEqual(["babywearing_cover"]);
  });

  it("still recommends blankets for mild stroller walks and cold car trips", () => {
    const stroller = recommend({ ...base, feelsLikeC: 13 });
    expect(stroller.transportExtras.map((e) => e.slug)).toContain("blanket");
    const car = recommend({ ...base, feelsLikeC: 6, situation: "car" });
    expect(car.transportExtras.map((e) => e.slug)).toContain("blanket");
  });

  it("offers the remaining stroller extras on a mild day", () => {
    const rec = recommend(base);
    const optional = rec.optionalTransportExtras.map((e) => e.slug);
    expect(optional).toContain("rain_cover");
    expect(optional).toContain("footmuff");
    expect(optional.every((s) => !rec.transportExtras.some((r) => r.slug === s))).toBe(true);
  });

  it("marks extras the parent does not own", () => {
    const rec = recommend({ ...base, owned: new Set([]) });
    const footmuff = rec.optionalTransportExtras.find((e) => e.slug === "footmuff");
    expect(footmuff?.owned).toBe(false);
  });

  it("returns none at home", () => {
    const rec = recommend({ ...base, situation: "home", roomTempC: 21 });
    expect(rec.optionalTransportExtras).toEqual([]);
  });

  it("never produces an adjustment for an optional extra", () => {
    const rec = recommend(base);
    const optional = rec.optionalTransportExtras[0];
    expect(optional).toBeDefined();
    const ideal = idealOutfitFrom(rec);
    const actual = { ...EMPTY_OUTFIT, transportExtras: [optional!.slug] };
    const result = compareOutfits(ideal, actual);
    expect(result.missingTransportExtras).not.toContain(optional!.slug);
  });
});
