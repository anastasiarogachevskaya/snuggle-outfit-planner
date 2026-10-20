import { localizeTempText, type TempUnit } from "@/lib/units";

// Presentation only: never rename persisted wardrobe slugs or engine inputs.
const US_TERMS: [RegExp, string][] = [
  [/\bwinter overall\b/gi, "snowsuit"],
  [/\bfleece overall\b/gi, "fleece suit"],
  [/\bwool overall\b/gi, "wool suit"],
  [/\bsoftshell overall\b/gi, "softshell suit"],
  [/\brain overall\b/gi, "rain suit"],
  [/\blight overall\b/gi, "lightweight suit"],
  [/\boveralls?\b/gi, "one-piece suit"],
  [/\bbodysuits?\b/gi, "bodysuit"],
  [/\bsleepsuit\b/gi, "one-piece pajamas"],
  [/\bpram\b/gi, "bassinet stroller"],
  [/\bfootmuff\b/gi, "stroller bunting"],
  [/\btrousers\b/gi, "pants"],
  [/\bnappy\b/gi, "diaper"],
  [/\bautumn\b/gi, "fall"],
];

export function localizeClothingText(text: string, unit: TempUnit): string {
  let result = localizeTempText(text, unit);
  if (unit !== "F") return result;
  for (const [pattern, replacement] of US_TERMS) {
    result = result.replace(pattern, (match) =>
      /^[A-Z]/.test(match) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement,
    );
  }
  return result;
}