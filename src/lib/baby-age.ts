/**
 * Calendar-month diff (ignores day-of-month), matching how a parent would
 * describe a baby's age ("she's 4 months"). Shared by the web app and the
 * MCP tools so both agree on the same baby's age on the same day — the
 * recommendation engine's age bias buckets at exact month boundaries
 * (see ageGroup() in recommend/temperature.ts), so two different formulas
 * can silently disagree right at those boundaries.
 */
export function ageInMonths(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}
