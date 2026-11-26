import type { OutingMovement, OutdoorActivity } from "./outing-context";
import type { Situation } from "./recommend";

/** Planning choices only, never safe-exposure limits. General outdoor includes 90. */
export function durationPresets(
  situation: Situation,
  movement?: OutingMovement,
  activity?: OutdoorActivity,
): readonly number[] {
  if (situation === "home") return [];
  if (situation === "car") return [15, 30, 60, 120];
  if (movement === "seated" || movement === "mixed") return [15, 30, 60, 90];
  if (activity === "playground") return [30, 60, 90];
  if (activity === "stroll" || activity === "wet_play" || activity === "snow_play")
    return [15, 30, 60];
  return [15, 30, 60, 90];
}

export function isDurationMinutes(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function parseDurationMinutes(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return isDurationMinutes(value) ? value : null;
}

/** Exact offset sent to the existing hourly lookup, with no preset conversion. */
export function outingEndOffset(duration: number, leaveIn = 0): number {
  return leaveIn + duration;
}

export function outingEndTime(startIso: string, duration: number, leaveIn = 0): Date {
  return new Date(new Date(startIso).getTime() + outingEndOffset(duration, leaveIn) * 60_000);
}
