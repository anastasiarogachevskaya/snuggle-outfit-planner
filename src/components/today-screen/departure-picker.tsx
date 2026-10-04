import { selectionHaptic } from "@/lib/haptics";

/** Minutes from now until the parent heads out. 0 = now. */
export type LeaveIn = number;

function hourLabel(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

/** Full hours left today, starting 3h out (1h/2h have their own buttons). */
function laterHoursToday(now: Date): { minutes: number; label: string }[] {
  const out: { minutes: number; label: string }[] = [];
  for (let h = now.getHours() + 3; h <= 23; h++) {
    const t = new Date(now);
    t.setHours(h, 0, 0, 0);
    out.push({ minutes: Math.round((t.getTime() - now.getTime()) / 60_000), label: hourLabel(t) });
  }
  return out;
}

export function DeparturePicker({
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
  const pill = (active: boolean) =>
    `rounded-full px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground" : "bg-surface text-ink/70 border border-black/5"
    }`;

  return (
    <section className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary/60">Leaving</p>
      <div className="flex flex-wrap gap-2">
        <button className={pill(value === 0)} onClick={() => set(0)}>
          Now
        </button>
        {now.getHours() <= 22 && (
          <button className={pill(value === 60)} onClick={() => set(60)}>
            In 1h
          </button>
        )}
        {now.getHours() <= 21 && (
          <button className={pill(value === 120)} onClick={() => set(120)}>
            In 2h
          </button>
        )}
        {later.length > 0 && (
          <label className={`${pill(isCustom)} relative`}>
            {isCustom
              ? hourLabel(new Date(now.getTime() + (value + 30) * 60_000))
              : "Set time"}{" "}
            ▾
            <select
              aria-label="Pick a time later today"
              className="absolute inset-0 opacity-0"
              value={isCustom ? String(later.find((o) => Math.abs(o.minutes - value) < 30)?.minutes ?? "") : ""}
              onChange={(e) => e.target.value && set(Number(e.target.value))}
            >
              <option value="">Pick a time</option>
              {later.map((o) => (
                <option key={o.minutes} value={o.minutes}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </section>
  );
}
