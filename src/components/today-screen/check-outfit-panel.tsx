import { useState } from "react";
import { LABEL_BY_SLUG, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import type { Recommendation } from "@/lib/recommend";
import {
  BODYSUIT_SLUGS,
  SLEEPSUIT_SLUGS,
  BOTTOM_SLUGS,
  MID_SLUGS,
  OUTER_SLUGS,
  HAT_SLUGS,
  SOCK_SLUGS,
  EMPTY_OUTFIT,
  idealOutfitFrom,
  compareOutfits,
  type ActualOutfit,
  type OutfitVerdict,
  type SlotAdjustment,
  type SlotKey,
} from "@/lib/recommend/warmth";
import { lightHaptic, selectionHaptic, successHaptic, warningHaptic } from "@/lib/haptics";

const VERDICT_COPY: Record<OutfitVerdict, { emoji: string; title: string }> = {
  too_cold: { emoji: "🥶", title: "A bit too light for today" },
  just_right: { emoji: "😊", title: "Just right for today" },
  too_warm: { emoji: "🥵", title: "A bit too warm for today" },
};

const NONE_CHIP =
  "min-h-9 rounded-xl border px-3 text-xs transition-colors border-transparent bg-canvas text-ink/60";
const NONE_CHIP_SELECTED =
  "min-h-9 rounded-xl border px-3 text-xs transition-colors border-transparent bg-primary/15 font-medium text-primary";
const NONE_CHIP_NEEDS_ADD =
  "min-h-9 rounded-xl border-2 border-primary px-3 text-xs font-medium text-primary ring-2 ring-primary/30 transition-colors";
const CHIP_SELECTED =
  "min-h-9 rounded-xl border px-3 text-xs transition-colors border-transparent bg-primary/15 font-medium text-primary";
const CHIP_DEFAULT =
  "min-h-9 rounded-xl border px-3 text-xs transition-colors border-transparent bg-canvas text-ink/60";
const CHIP_REMOVE =
  "min-h-9 rounded-xl border-2 border-destructive px-3 text-xs font-medium text-destructive ring-2 ring-destructive/30 transition-colors";
const CHIP_SUGGESTED =
  "min-h-9 rounded-xl border-2 border-dashed border-primary px-3 text-xs font-medium text-primary transition-colors";

/**
 * A single-select row of pill buttons, plus a "None" option, for one outfit
 * slot. When `adjustment` is set (after a check), the chip that should be
 * removed, or the option that should be added, is highlighted directly —
 * not just named in a text list.
 */
function SlotRow<T extends WardrobeSlug | "none">({
  label,
  options,
  value,
  onChange,
  adjustment,
}: {
  label: string;
  options: WardrobeSlug[];
  value: T;
  onChange: (v: T) => void;
  adjustment?: SlotAdjustment;
}) {
  const noneClassName =
    value === "none"
      ? adjustment?.type === "add"
        ? NONE_CHIP_NEEDS_ADD
        : NONE_CHIP_SELECTED
      : NONE_CHIP;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-primary/60">{label}</p>
        {adjustment && (
          <span
            className={
              "text-[10px] font-semibold uppercase tracking-wide " +
              (adjustment.type === "add" ? "text-primary" : "text-destructive")
            }
          >
            {adjustment.type === "add" ? "Add" : "Remove"}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            selectionHaptic();
            onChange("none" as T);
          }}
          aria-pressed={value === "none"}
          className={noneClassName}
        >
          None
        </button>
        {options.map((slug) => {
          const isSelected = value === slug;
          const isRemoveTarget =
            isSelected && adjustment?.type === "remove" && adjustment.actualSlug === slug;
          const isSuggested =
            !isSelected && adjustment?.type === "add" && adjustment.idealSlug === slug;
          const className = isRemoveTarget
            ? CHIP_REMOVE
            : isSuggested
              ? CHIP_SUGGESTED
              : isSelected
                ? CHIP_SELECTED
                : CHIP_DEFAULT;
          return (
            <button
              key={slug}
              onClick={() => {
                selectionHaptic();
                onChange(slug as T);
              }}
              aria-pressed={isSelected}
              className={className}
            >
              {LABEL_BY_SLUG[slug]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  adjustment,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  adjustment?: SlotAdjustment;
}) {
  const isRemoveTarget = value && adjustment?.type === "remove";
  const isSuggested = !value && adjustment?.type === "add";
  const className = isRemoveTarget
    ? CHIP_REMOVE
    : isSuggested
      ? CHIP_SUGGESTED
      : value
        ? CHIP_SELECTED
        : CHIP_DEFAULT;
  return (
    <button
      onClick={() => {
        selectionHaptic();
        onChange(!value);
      }}
      aria-pressed={value}
      className={className}
    >
      {label}
    </button>
  );
}

/**
 * Replaces the recommendation card in place (not a modal — a bottom sheet
 * doesn't behave well in the iOS WKWebView, and a free-for-all "tick
 * everything" picker let a parent select three bodysuits at once and call
 * it valid). Each slot here is a single choice, mirroring recommend()'s own
 * LayerNeed/AccessoryNeed shape, so the comparison and the highlighted
 * add/remove guidance are both meaningful.
 */
export function CheckOutfitPanel({
  rec,
  owned,
  onBack,
}: {
  rec: Recommendation;
  owned: Set<WardrobeSlug>;
  onBack: () => void;
}) {
  const [actual, setActual] = useState<ActualOutfit>(EMPTY_OUTFIT);
  const [result, setResult] = useState<ReturnType<typeof compareOutfits> | null>(null);

  const owns = (slugs: WardrobeSlug[]) => slugs.filter((s) => owned.has(s));

  const set = <K extends keyof ActualOutfit>(key: K, value: ActualOutfit[K]) => {
    setResult(null);
    setActual((prev) => ({ ...prev, [key]: value }));
  };

  const checkOutfit = () => {
    const r = compareOutfits(idealOutfitFrom(rec), actual);
    setResult(r);
    if (r.verdict === "just_right") successHaptic();
    else warningHaptic();
  };

  const adjustmentBySlot: Partial<Record<SlotKey, SlotAdjustment>> = {};
  for (const a of result?.adjustments ?? []) adjustmentBySlot[a.slot] = a;

  return (
    <section className="mb-10">
      <div className="w-full max-w-full overflow-hidden bg-surface rounded-[32px] p-7 shadow-sm border border-black/5">
        <button
          onClick={() => {
            lightHaptic();
            onBack();
          }}
          className="mb-3 text-xs font-medium text-primary"
        >
          ← Back to recommendation
        </button>
        <h1 className="mb-1 text-3xl font-serif font-semibold">Check my outfit</h1>
        <p className="mb-6 text-ink/60 leading-relaxed">
          Pick what baby's actually wearing right now.
        </p>

        {result && (
          <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-center font-medium">
            {VERDICT_COPY[result.verdict].emoji} {VERDICT_COPY[result.verdict].title}
          </div>
        )}

        <div className="space-y-5">
          <SlotRow
            label="Bodysuit"
            options={owns(BODYSUIT_SLUGS)}
            value={actual.bodysuit}
            onChange={(v) => set("bodysuit", v)}
            adjustment={adjustmentBySlot.bodysuit}
          />
          <SlotRow
            label="Sleepsuit / romper"
            options={owns(SLEEPSUIT_SLUGS)}
            value={actual.sleepsuit}
            onChange={(v) => set("sleepsuit", v)}
            adjustment={adjustmentBySlot.sleepsuit}
          />
          <SlotRow
            label="Bottoms"
            options={owns(BOTTOM_SLUGS)}
            value={actual.bottom}
            onChange={(v) => set("bottom", v)}
            adjustment={adjustmentBySlot.bottom}
          />
          <SlotRow
            label="Mid layer"
            options={owns(MID_SLUGS)}
            value={actual.mid}
            onChange={(v) => set("mid", v)}
            adjustment={adjustmentBySlot.mid}
          />
          <SlotRow
            label="Outer layer"
            options={owns(OUTER_SLUGS)}
            value={actual.outer}
            onChange={(v) => set("outer", v)}
            adjustment={adjustmentBySlot.outer}
          />
          <SlotRow
            label="Hat"
            options={owns(HAT_SLUGS)}
            value={actual.hat}
            onChange={(v) => set("hat", v)}
            adjustment={adjustmentBySlot.hat}
          />
          <SlotRow
            label="Socks"
            options={owns(SOCK_SLUGS)}
            value={actual.socks}
            onChange={(v) => set("socks", v)}
            adjustment={adjustmentBySlot.socks}
          />
          <div className="flex flex-wrap gap-2">
            {owned.has("snow_pants") && (
              <ToggleRow
                label="Snow pants"
                value={actual.snowPants}
                onChange={(v) => set("snowPants", v)}
                adjustment={adjustmentBySlot.snowPants}
              />
            )}
            {owned.has("mittens") && (
              <ToggleRow
                label="Mittens"
                value={actual.mittens}
                onChange={(v) => set("mittens", v)}
                adjustment={adjustmentBySlot.mittens}
              />
            )}
          </div>
        </div>

        <button
          onClick={checkOutfit}
          className="mt-6 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-md shadow-primary/20"
        >
          {result ? "Check again" : "Check outfit"}
        </button>
      </div>
    </section>
  );
}
