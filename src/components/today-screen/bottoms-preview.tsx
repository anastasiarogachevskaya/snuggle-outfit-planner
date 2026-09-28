import { useMemo, useState } from "react";
import { LABEL_BY_SLUG, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import type { Recommendation } from "@/lib/recommend";
import type { OutfitVerdict, SlotAdjustment, SlotKey } from "@/lib/recommend/warmth";
import { compareBottoms } from "@/lib/recommend/compare-bottoms";
import { selectionHaptic } from "@/lib/haptics";

const SLOT_FALLBACK: Record<SlotKey, string> = {
  bodysuit: "bodysuit",
  sleepsuit: "sleepsuit",
  bottom: "bottoms",
  mid: "mid layer",
  outer: "outer layer",
  hat: "hat",
  socks: "socks",
  snowPants: "snow pants",
  mittens: "mittens",
};

const VERDICT_TEXT: Record<OutfitVerdict, string> = {
  too_cold: "Lighter than today needs",
  just_right: "Right for today",
  too_warm: "Warmer than today needs",
};

const VERDICT_TONE: Record<OutfitVerdict, string> = {
  too_cold: "bg-ink/5 text-ink/70",
  just_right: "bg-primary/10 text-primary",
  too_warm: "bg-accent/10 text-accent-foreground",
};

function adjustmentText(a: SlotAdjustment): string {
  const slug = a.type === "add" ? a.idealSlug : a.actualSlug;
  const name = slug ? LABEL_BY_SLUG[slug] : SLOT_FALLBACK[a.slot];
  return a.type === "add" ? `Add ${name.toLowerCase()}` : `Skip the ${name.toLowerCase()}`;
}

/**
 * Lets a parent tap between thin leggings, pants and wool leggings and see
 * how the same day's outfit changes — the warmth difference is real but
 * invisible in a single recommendation card.
 */
export function BottomsPreview({
  rec,
  owned,
  appliedBottom = null,
  onApply,
  onReset,
}: {
  rec: Recommendation;
  owned: Set<WardrobeSlug>;
  /** Bottom the parent already applied to today's card, if any. */
  appliedBottom?: WardrobeSlug | null;
  onApply?: (slug: WardrobeSlug) => void;
  onReset?: () => void;
}) {
  const { options } = useMemo(() => compareBottoms(rec, owned), [rec, owned]);
  const recommended = options.find((o) => o.isRecommended);
  const [selected, setSelected] = useState<WardrobeSlug | null>(null);

  if (options.length === 0) return null;

  const active =
    options.find((o) => o.slug === selected) ??
    options.find((o) => o.slug === appliedBottom) ??
    recommended ??
    options[0];
  const isApplied = appliedBottom === active.slug;

  return (
    <section className="mb-10">
      <div className="w-full max-w-full overflow-hidden rounded-[32px] border border-black/5 bg-surface p-6 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-primary/60">
          Compare bottoms
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold">What if you picked different bottoms?</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink/60">
          Same weather, same plan — tap an option to see how the rest of the outfit changes.
        </p>

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {options.map((o) => {
            const isActive = o.slug === active.slug;
            return (
              <button
                key={o.slug}
                onClick={() => {
                  selectionHaptic();
                  setSelected(o.slug);
                }}
                aria-pressed={isActive}
                className={
                  "min-h-11 shrink-0 rounded-2xl px-5 text-[13px] transition-all duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 " +
                  (isActive
                    ? "border-2 border-primary bg-surface font-semibold text-primary shadow-sm"
                    : "border border-black/10 bg-surface font-medium text-ink/60")
                }
              >
                {LABEL_BY_SLUG[o.slug]}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl bg-canvas/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                "rounded-full px-3 py-1 text-[11px] font-semibold " + VERDICT_TONE[active.verdict]
              }
            >
              {VERDICT_TEXT[active.verdict]}
            </span>
            {active.isRecommended && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                Today's pick
              </span>
            )}
            {isApplied && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                Applied to today
              </span>
            )}
            {!active.owned && (
              <span className="rounded-full bg-ink/5 px-3 py-1 text-[11px] font-medium text-ink/50">
                Not in your wardrobe
              </span>
            )}
          </div>

          {active.adjustments.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {active.adjustments.map((a, i) => (
                <li key={i} className="border-l-2 border-accent/40 pl-3 text-sm text-ink/75">
                  {adjustmentText(a)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink/70">
              {active.isRecommended
                ? "Everything else stays exactly as recommended."
                : "The rest of the outfit can stay the same."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
