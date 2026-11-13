/**
 * Completed age in months, shared by the web app and the MCP tools so both
 * agree on the same child's age on the same day (the recommendation engine's
 * age bias buckets at exact month boundaries — see ageGroup() in
 * recommend/temperature.ts).
 *
 * Conventions:
 * - Birthdays are date-only "YYYY-MM-DD" values, read as calendar dates
 *   (never parsed as UTC instants), so device time zones cannot shift them.
 * - A Date reference is read in the device's local calendar ("today" where
 *   the parent is); a "YYYY-MM-DD" reference is used as-is.
 * - A month completes on the same day-of-month as the birthday. When the
 *   target month is shorter (born on the 31st, or 29 February in a non-leap
 *   year) it completes on that month's last day.
 * - Missing, invalid and future birthdays return null (unknown) — never 0.
 */
export type Ymd = { y: number; m: number; d: number };

export type ChildStage = "infant" | "toddler_12_23" | "toddler_24_35" | "child_36_plus" | "unknown";

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

export function toYmd(value: string | Date | null | undefined): Ymd | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate() };
  }
  const match = YMD_RE.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function completedMonths(
  dob: string | null | undefined,
  reference: string | Date = new Date(),
): number | null {
  const b = toYmd(dob);
  const r = toYmd(reference);
  if (!b || !r) return null;
  let months = (r.y - b.y) * 12 + (r.m - b.m);
  const anniversaryDay = Math.min(b.d, daysInMonth(r.y, r.m));
  if (r.d < anniversaryDay) months -= 1;
  return months < 0 ? null : months;
}

export function stageFromMonths(months: number | null | undefined): ChildStage {
  if (months == null || !Number.isFinite(months) || months < 0) return "unknown";
  if (months < 12) return "infant";
  if (months < 24) return "toddler_12_23";
  if (months < 36) return "toddler_24_35";
  return "child_36_plus";
}

export function childStage(
  dob: string | null | undefined,
  reference: string | Date = new Date(),
): ChildStage {
  return stageFromMonths(completedMonths(dob, reference));
}

/** Backward-compatible name used across the app. */
export function ageInMonths(
  dob: string | null | undefined,
  reference: string | Date = new Date(),
): number | null {
  return completedMonths(dob, reference);
}
