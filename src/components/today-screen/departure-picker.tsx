import { selectionHaptic } from "@/lib/haptics";

/** Minutes from now until the parent heads out. 0 = now. */
export type LeaveIn = number;

export function hourLabel(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

/** Full hours left today, starting 3h out (1h/2h have their own options). */
export function laterHoursToday(now: Date): { minutes: number; label: string }[] {
  const out: { minutes: number; label: string }[] = [];
  for (let h = now.getHours() + 3; h <= 23; h++) {
    const t = new Date(now);
    t.setHours(h, 0, 0, 0);
    out.push({ minutes: Math.round((t.getTime() - now.getTime()) / 60_000), label: hourLabel(t) });
  }
  return out;
}

/**
 * The underlined time word in the weather line — "Now", or the chosen hour.
 * Tapping it opens the native time picker; the whole line then describes the
 * forecast for that moment.
 */
export function DepartureTimeWord({
  value,
  onChange,
}: {
  value: LeaveIn;
  onChange: (v: LeaveIn) => void;
}) {
  const now = new Date();
  const later = laterHoursToday(now);
  const isCustom = value !== 0 && value !== 60 && value !== 120;
  const set = (v: number) => {
    if (v === value) return;
    selectionHaptic();
    onChange(v);
  };
  const label =
    value === 0 ? "Now" : hourLabel(new Date(now.getTime() + (value + 30) * 60_000));

  return (
    <label className="relative inline-flex cursor-pointer items-baseline">
      <span
        aria-hidden
        className="text-2xl font-serif font-semibold text-ink underline decoration-primary/50 decoration-[3px] underline-offset-[6px]"
      >
        {label}
      </span>
      <select
        aria-label="Choose a time"
        className="absolute inset-0 opacity-0"
        value={
          isCustom
            ? String(later.find((o) => Math.abs(o.minutes - value) < 30)?.minutes ?? "")
            : String(value)
        }
        onChange={(e) => e.target.value && set(Number(e.target.value))}
      >
        <option value="0">Now</option>
        {now.getHours() <= 22 && <option value="60">In 1h</option>}
        {now.getHours() <= 21 && <option value="120">In 2h</option>}
        {later.map((o) => (
          <option key={o.minutes} value={o.minutes}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
