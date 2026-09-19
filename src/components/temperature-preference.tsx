import { selectionHaptic } from "@/lib/haptics";

const PREFERENCES = [
  { value: 1, label: "Runs very warm" },
  { value: 2, label: "Runs warm" },
  { value: 3, label: "Average" },
  { value: 4, label: "Runs cold" },
  { value: 5, label: "Runs very cold" },
] as const;

export function temperaturePreferenceLabel(value: number) {
  return PREFERENCES.find((preference) => preference.value === value)?.label ?? "Average";
}

export function TemperaturePreference({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const currentLabel = temperaturePreferenceLabel(value);

  return (
    <fieldset>
      <legend className="text-xs font-medium uppercase tracking-widest text-ink/70">
        Temperature preference
      </legend>
      <p className="mt-2 text-base font-semibold text-ink" aria-live="polite">
        {currentLabel}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink/60">
        Does your baby usually feel warmer or colder than expected?
      </p>

      <div className="mt-4 grid grid-cols-5 gap-2" aria-label="Temperature preference">
        {PREFERENCES.map((preference) => {
          const selected = preference.value === value;
          return (
            <label key={preference.value} className="cursor-pointer">
              <input
                type="radio"
                name="temperature-preference"
                value={preference.value}
                checked={selected}
                onChange={() => {
                  onChange(preference.value);
                  selectionHaptic();
                }}
                className="peer sr-only"
              />
              <span
                className="flex min-h-12 items-center justify-center rounded-xl border border-ink/10 bg-surface text-sm font-semibold text-ink/55 transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas"
                aria-hidden="true"
              >
                {preference.value}
              </span>
              <span className="sr-only">{preference.label}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs font-medium text-ink/60" aria-hidden="true">
        <span>Runs warm</span>
        <span>Average</span>
        <span>Runs cold</span>
      </div>
    </fieldset>
  );
}