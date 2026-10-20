/** Display-only unit conversion. The recommendation engine always works in °C. */
export type TempUnit = "C" | "F";

const F_REGIONS = new Set(["US", "LR", "MM", "BS", "BZ", "KY", "PW", "FM", "MH"]);

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

export function toUnit(c: number, unit: TempUnit): number {
  return Math.round(unit === "F" ? cToF(c) : c);
}

/** "15°" or with suffix "15°C" / "59°F". */
export function formatTemp(c: number, unit: TempUnit, opts: { suffix?: boolean } = {}): string {
  return `${toUnit(c, unit)}°${opts.suffix ? unit : ""}`;
}

export function formatWind(kph: number, unit: TempUnit): string {
  return unit === "F" ? `${Math.round(kph * 0.621371)}mph` : `${Math.round(kph)}km/h`;
}

export function defaultUnitFromLocale(locale: string | undefined): TempUnit {
  if (!locale) return "C";
  const region = locale.split(/[-_]/)[1]?.toUpperCase();
  return region && F_REGIONS.has(region) ? "F" : "C";
}

/** Rewrites "12°C" occurrences in engine-generated text for display. */
export function localizeTempText(text: string, unit: TempUnit): string {
  if (unit === "C") return text;
  return text
    .replace(/(-?\d+(?:\.\d+)?)([––−-])(-?\d+(?:\.\d+)?)\s?°C/g, (_, low, dash, high) =>
      `${Math.round(cToF(Number(low)))}${dash}${Math.round(cToF(Number(high)))}°F`,
    )
    .replace(/(-?\d+(?:\.\d+)?)\s?°C/g, (_, n) => `${Math.round(cToF(Number(n)))}°F`);
}

/** Slider values are displayed in the chosen unit; engine inputs stay in °C. */
export function roomTemperatureRange(unit: TempUnit) {
  return { min: toUnit(15, unit), max: toUnit(30, unit), step: 1 };
}

export function roomTemperatureToC(value: number, unit: TempUnit): number {
  return unit === "F" ? fToC(value) : value;
}
