// @ts-expect-error bun:test is provided by the bun test runner
import { describe, expect, test } from "bun:test";
import { defaultUnitFromLocale, formatWind, localizeTempText, toUnit, roomTemperatureRange, roomTemperatureToC } from "../units";

describe("temperature units", () => {
  test("room selection advances exactly 1°F and retains Celsius engine inputs", () => {
    expect(roomTemperatureRange("F")).toEqual({ min: 59, max: 86, step: 1 });
    expect(roomTemperatureToC(68, "F")).toBe(20);
    expect(toUnit(roomTemperatureToC(69, "F"), "F")).toBe(69);
    expect(roomTemperatureToC(69, "F") - roomTemperatureToC(68, "F")).toBeCloseTo(5 / 9);
  });
  test("Celsius room selection keeps its original 15–30°C limits and 1°C steps", () => {
    expect(roomTemperatureRange("C")).toEqual({ min: 15, max: 30, step: 1 });
    expect(roomTemperatureToC(21, "C")).toBe(21);
  });
  test("conversions", () => {
    expect(toUnit(0, "F")).toBe(32);
    expect(toUnit(20, "F")).toBe(68);
    expect(toUnit(-10, "F")).toBe(14);
    expect(toUnit(20, "C")).toBe(20);
  });
  test("locale default", () => {
    expect(defaultUnitFromLocale("en-US")).toBe("F");
    expect(defaultUnitFromLocale("fi-FI")).toBe("C");
    expect(defaultUnitFromLocale("en")).toBe("C");
  });
  test("notes rendered in °F", () => {
    expect(localizeTempText("Room is ~20°C — light clothing only.", "F")).toBe(
      "Room is ~68°F — light clothing only.",
    );
    expect(localizeTempText("It's -10°C now", "F")).toBe("It's 14°F now");
  });
  test("wind in mph", () => {
    expect(formatWind(10, "F")).toBe("6mph");
    expect(formatWind(10, "C")).toBe("10km/h");
  });
});
