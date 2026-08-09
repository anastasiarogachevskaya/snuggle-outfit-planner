// @ts-expect-error bun:test is provided by the bun test runner
import { describe, it, expect } from "bun:test";
import { TEMP, bandFor, ageGroup, ageAdjustmentC } from "../recommend/temperature";
import { idealTogFor, TOG_ITEMS } from "../recommend/pick-sleep";

describe("bandFor", () => {
  const cases: [number, string][] = [
    [40, "very_hot"],
    [26, "very_hot"],
    [25.9, "hot"],
    [22, "hot"],
    [21.9, "warm"],
    [18, "warm"],
    [17.9, "mild"],
    [15, "mild"],
    [14.9, "cool"],
    [10, "cool"],
    [9.9, "cold"],
    [5, "cold"],
    [4.9, "frost"],
    [0, "frost"],
    [-0.1, "freezing"],
    [-20, "freezing"],
  ];

  for (const [t, band] of cases) {
    it(`${t}°C → ${band}`, () => {
      expect(bandFor(t)).toBe(band);
    });
  }

  it("thresholds are strictly descending", () => {
    const values = [TEMP.VERY_HOT, TEMP.HOT, TEMP.WARM, TEMP.MILD, TEMP.COOL, TEMP.COLD, TEMP.FREEZING];
    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1]).toBeGreaterThan(values[i]);
    }
  });
});

describe("ageGroup", () => {
  it("maps months to groups, including boundaries", () => {
    expect(ageGroup(0)).toBe("0-3");
    expect(ageGroup(2.9)).toBe("0-3");
    expect(ageGroup(3)).toBe("3-6");
    expect(ageGroup(5.9)).toBe("3-6");
    expect(ageGroup(6)).toBe("6-12");
    expect(ageGroup(11.9)).toBe("6-12");
    expect(ageGroup(12)).toBe("12+");
    expect(ageGroup(48)).toBe("12+");
  });

  it("returns unknown for null/undefined", () => {
    expect(ageGroup(null)).toBe("unknown");
    expect(ageGroup(undefined)).toBe("unknown");
  });
});

describe("ageAdjustmentC", () => {
  it("younger babies get a colder bias, older ones a warmer one", () => {
    expect(ageAdjustmentC("0-3")).toBeLessThan(0);
    expect(ageAdjustmentC("3-6")).toBe(0);
    expect(ageAdjustmentC("unknown")).toBe(0);
    expect(ageAdjustmentC("6-12")).toBeGreaterThan(0);
    expect(ageAdjustmentC("12+")).toBeGreaterThan(ageAdjustmentC("6-12"));
  });
});

describe("idealTogFor", () => {
  it("drops TOG as the room gets warmer and stops above 27°C", () => {
    expect(idealTogFor(27)).toBeNull();
    expect(idealTogFor(30)).toBeNull();
    expect(idealTogFor(26)).toBe(0.5);
    expect(idealTogFor(24)).toBe(0.5);
    expect(idealTogFor(23.9)).toBe(1.0);
    expect(idealTogFor(20)).toBe(1.0);
    expect(idealTogFor(19.9)).toBe(2.5);
    expect(idealTogFor(16)).toBe(2.5);
    expect(idealTogFor(15.9)).toBe(3.5);
  });

  it("never returns a TOG that has no wardrobe item", () => {
    const available = TOG_ITEMS.map((i) => i.tog);
    for (let t = 10; t <= 30; t++) {
      const tog = idealTogFor(t);
      if (tog !== null) expect(available).toContain(tog);
    }
  });
});
