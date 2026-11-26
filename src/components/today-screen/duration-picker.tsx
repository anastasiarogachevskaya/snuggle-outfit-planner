import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseDurationMinutes } from "@/lib/outing-duration";

export function DurationPicker({
  value,
  presets,
  customAllowed,
  onChange,
  label = "Duration",
}: {
  value: number;
  presets: readonly number[];
  customAllowed: boolean;
  onChange: (value: number) => void;
  label?: string;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const customSelected = !presets.includes(value);
  const chip = (selected: boolean) =>
    "min-h-11 h-auto whitespace-normal rounded-xl px-3 py-2 " +
    (selected ? "bg-primary/15 text-primary font-medium" : "bg-canvas text-ink/70");
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-sm text-ink/70">
        {label} · <span className="font-medium text-ink">{value} min</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((minutes) => (
          <Button
            key={minutes}
            type="button"
            variant="ghost"
            aria-pressed={value === minutes}
            className={chip(value === minutes)}
            onClick={() => {
              onChange(minutes);
              setEditing(false);
              setError(false);
            }}
          >
            {minutes} min
          </Button>
        ))}
        {customAllowed && (
          <Button
            type="button"
            variant="ghost"
            aria-pressed={customSelected || editing}
            aria-expanded={editing}
            aria-controls={id}
            className={chip(customSelected || editing)}
            onClick={() => {
              setDraft(String(value));
              setEditing(true);
              setError(false);
            }}
          >
            Custom
          </Button>
        )}
      </div>
      {customAllowed && editing && (
        <form
          id={id}
          className="mt-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const next = parseDurationMinutes(draft);
            if (next === null) {
              setError(true);
              return;
            }
            onChange(next);
            setError(false);
            setEditing(false);
          }}
        >
          <label htmlFor={`${id}-minutes`} className="mb-2 block text-sm text-ink/70">
            Custom minutes
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-minutes`}
              type="text"
              inputMode="numeric"
              autoFocus
              value={draft}
              aria-invalid={error}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-11 min-w-0"
            />
            <Button type="submit" className="min-h-11">
              Apply
            </Button>
          </div>
          {error && (
            <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">
              Enter a positive whole number of minutes.
            </p>
          )}
        </form>
      )}
      {customAllowed && (
        <p className="mt-2 text-xs text-ink/60">
          Planned length, not a recommended or guaranteed safe exposure time.
        </p>
      )}
    </div>
  );
}
