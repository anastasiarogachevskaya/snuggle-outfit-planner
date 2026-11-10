import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GARMENT_DETAIL_OPTIONS,
  changedGarmentDetails,
  garmentDetailFields,
  type GarmentDetailField,
  type GarmentDetails,
} from "@/lib/garment-details";
import { submitGarmentDetails } from "@/lib/garment-details-save";

/**
 * Edit the optional details of one owned garment. Unset values show as
 * "Not sure"; nothing is prefilled from the name, picture or warmth tag.
 * Only changed fields are passed to onSave. A failed save keeps the dialog
 * open with the parent's edits.
 */
export function GarmentDetailsDialog({
  open,
  slug,
  label,
  details,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  slug: string;
  label: string;
  details: GarmentDetails;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<GarmentDetails>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<GarmentDetails>(details);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(details);
      setError(null);
    }
    // Reset only when (re)opened, so a failed save keeps the edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slug]);

  const fields = garmentDetailFields(slug);
  const patch = changedGarmentDetails(details, draft);
  const dirty = Object.keys(patch).length > 0;

  const save = async () => {
    if (!dirty) return onOpenChange(false);
    setSaving(true);
    setError(null);
    const result = await submitGarmentDetails(details, draft, onSave);
    setSaving(false);
    if (result.status === "failed") {
      // Keep the parent's edits on screen so they can retry.
      setDraft(result.draft);
      setError(result.message);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto bg-canvas font-sans text-ink">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{label}</DialogTitle>
          <DialogDescription className="text-ink/60">
            Optional. Leave anything you're unsure about as “Not sure”.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {fields.map((field) => (
            <FieldGroup
              key={field}
              field={field}
              slug={slug}
              value={draft[field]}
              onChange={(v) => setDraft((d) => ({ ...d, [field]: v }))}
            />
          ))}
          {draft.availability !== "available" && (
            <p className="text-xs text-ink/55">
              This stays in your wardrobe with its details. Set it back to Available any time.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  field,
  slug,
  value,
  onChange,
}: {
  field: GarmentDetailField;
  slug: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const spec = GARMENT_DETAIL_OPTIONS[field];
  const name = `${slug}-${field}`;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{spec.label}</legend>
      <div className="flex flex-wrap gap-2">
        {spec.options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-primary/50 " +
                (checked ? "border-primary bg-primary text-primary-foreground" : "border-black/10 bg-surface text-ink/75")
              }
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Compact "Details" action shown beside an owned item; never toggles ownership. */
export function GarmentDetailsButton({ label, badge, onClick }: { label: string; badge: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`Details for ${label}${badge ? ` (${badge})` : ""}`}
      className="shrink-0 rounded-xl border border-black/10 bg-surface px-2.5 py-1.5 text-xs font-medium text-primary"
    >
      {badge ? <span className="block text-[10px] text-ink/55">{badge}</span> : null}
      Details
    </button>
  );
}
