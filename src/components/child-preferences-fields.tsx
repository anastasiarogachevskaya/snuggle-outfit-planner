import { selectionHaptic } from "@/lib/haptics";
import type { ChildPreferences } from "@/lib/child-preferences";

const STYLE_OPTIONS: { value: ChildPreferences["clothing_style"]; label: string }[] = [
  { value: "bodysuits", label: "Bodysuits" },
  { value: "tops", label: "Tops" },
  { value: "both", label: "Both" },
];

const NAPPY_OPTIONS: { value: ChildPreferences["nappy_use"]; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Not sure" },
];

function Segmented<T extends string>({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium uppercase tracking-widest text-ink/70">
        {legend}
      </legend>
      {hint && <p className="mt-1 text-sm leading-relaxed text-ink/60">{hint}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => {
                onChange(o.value);
                selectionHaptic();
              }}
              className="peer sr-only"
            />
            <span className="flex min-h-12 items-center justify-center rounded-xl border border-ink/10 bg-surface px-2 text-sm font-semibold text-ink/60 transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Optional clothing and toileting preferences. Each control changes only its
 * own field — the toilet toggle never touches nappy use, and nothing here is
 * derived from age.
 */
export function ChildPreferencesFields({
  value,
  onChange,
}: {
  value: ChildPreferences;
  onChange: (next: ChildPreferences) => void;
}) {
  return (
    <div className="space-y-6">
      <Segmented
        name="clothing-style"
        legend="Clothing style"
        hint="Optional. What do you usually dress them in?"
        options={STYLE_OPTIONS}
        value={value.clothing_style}
        onChange={(clothing_style) => onChange({ ...value, clothing_style })}
      />
      <Segmented
        name="nappy-use"
        legend="Nappy use"
        hint="Optional. Do they still wear nappies?"
        options={NAPPY_OPTIONS}
        value={value.nappy_use}
        onChange={(nappy_use) => onChange({ ...value, nappy_use })}
      />
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink/10 bg-surface px-4 py-3">
        <span className="text-sm font-medium text-ink">
          Prefer clothes that are easy to remove for toilet visits
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={value.easy_toilet_access}
          onChange={(e) => {
            onChange({ ...value, easy_toilet_access: e.target.checked });
            selectionHaptic();
          }}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative h-7 w-12 shrink-0 rounded-full bg-ink/15 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas"
        />
      </label>
    </div>
  );
}
