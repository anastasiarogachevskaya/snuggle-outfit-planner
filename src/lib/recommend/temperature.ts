// Centralized temperature thresholds and bands.
// All comparisons in the recommendation engine should reference these
// constants instead of hard-coded numbers.

export const TEMP = {
  VERY_HOT: 26,
  HOT: 22,
  WARM: 18,
  MILD: 15,
  COOL: 10,
  COLD: 5,
  FREEZING: 0,
} as const;

export type Band =
  | "very_hot" // >= VERY_HOT (26+)
  | "hot" //       HOT..VERY_HOT (22..25)
  | "warm" //      WARM..HOT (18..21)
  | "mild" //      MILD..WARM (15..17)
  | "cool" //      COOL..MILD (10..14)
  | "cold" //      COLD..COOL (5..9)
  | "frost" //     FREEZING..COLD (0..4)
  | "freezing"; // < FREEZING

export function bandFor(tC: number): Band {
  if (tC >= TEMP.VERY_HOT) return "very_hot";
  if (tC >= TEMP.HOT) return "hot";
  if (tC >= TEMP.WARM) return "warm";
  if (tC >= TEMP.MILD) return "mild";
  if (tC >= TEMP.COOL) return "cool";
  if (tC >= TEMP.COLD) return "cold";
  if (tC >= TEMP.FREEZING) return "frost";
  return "freezing";
}

// Age groups — used to bias effective temperature slightly.
// Younger babies regulate temperature less well; older ones move more.
export type AgeGroup = "0-3" | "3-6" | "6-12" | "12+" | "unknown";

export function ageGroup(ageMonths: number | null | undefined): AgeGroup {
  if (ageMonths === null || ageMonths === undefined) return "unknown";
  if (ageMonths < 3) return "0-3";
  if (ageMonths < 6) return "3-6";
  if (ageMonths < 12) return "6-12";
  return "12+";
}

export function ageAdjustmentC(g: AgeGroup): number {
  switch (g) {
    case "0-3":
      return -0.5;
    case "6-12":
      return 0.5;
    case "12+":
      return 1;
    default:
      return 0;
  }
}
