import { useState } from "react";
import { WARDROBE_STEPS, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import {
  OUTFIT_CHECK_STEP_IDS,
  outfitWarmth,
  recommendedWarmth,
  verdictFor,
  type OutfitVerdict,
} from "@/lib/recommend/warmth";
import type { Recommendation } from "@/lib/recommend";
import { ClothingIcon } from "@/components/icons";
import { lightHaptic, selectionHaptic, successHaptic, warningHaptic } from "@/lib/haptics";

const VERDICT_COPY: Record<OutfitVerdict, { emoji: string; title: string; body: string }> = {
  too_cold: {
    emoji: "🥶",
    title: "A bit too light",
    body: "For today's conditions, this outfit is lighter than what's recommended. Consider adding a layer.",
  },
  just_right: {
    emoji: "😊",
    title: "Just right",
    body: "This outfit is a good match for today's conditions.",
  },
  too_warm: {
    emoji: "🥵",
    title: "A bit too warm",
    body: "For today's conditions, this outfit is warmer than what's recommended. Consider removing a layer.",
  },
};

/**
 * Lets a parent say what's actually on baby right now — independent of
 * whether they followed the suggestion above — and compares its warmth
 * against what recommend() picked for the same conditions. Nothing is
 * saved; this is a one-off check (see docs discussion: v1 is ephemeral).
 */
export function CheckOutfitSheet({
  rec,
  owned,
  onClose,
}: {
  rec: Recommendation;
  owned: Set<WardrobeSlug>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<WardrobeSlug>>(new Set());
  const [verdict, setVerdict] = useState<{ verdict: OutfitVerdict; diff: number } | null>(null);

  const steps = WARDROBE_STEPS.filter((s) => OUTFIT_CHECK_STEP_IDS.includes(s.id)).map((s) => ({
    ...s,
    items: s.items.filter((i) => owned.has(i.slug)),
  }));

  const toggle = (slug: WardrobeSlug) => {
    selectionHaptic();
    setVerdict(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const checkOutfit = () => {
    const result = verdictFor(outfitWarmth(selected), recommendedWarmth(rec));
    setVerdict(result);
    if (result.verdict === "just_right") successHaptic();
    else warningHaptic();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="check-outfit-title"
        className="flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-surface shadow-xl sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 id="check-outfit-title" className="font-serif text-2xl font-semibold">
            Check my outfit
          </h2>
          <button
            onClick={() => {
              lightHaptic();
              onClose();
            }}
            aria-label="Close"
            className="rounded-full p-1 text-ink/40"
          >
            ✕
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-ink/60">
          Tap everything baby is actually wearing right now.
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {steps.map((s) =>
            s.items.length === 0 ? null : (
              <section key={s.id}>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-primary/60">
                  {s.title}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {s.items.map((i) => {
                    const isSelected = selected.has(i.slug);
                    return (
                      <button
                        key={i.slug}
                        onClick={() => toggle(i.slug)}
                        className={
                          "relative flex items-center gap-2 rounded-2xl border p-3 text-left transition-all " +
                          (isSelected
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-canvas border-black/5")
                        }
                      >
                        <span className={isSelected ? "text-primary" : "text-ink/60"}>
                          <ClothingIcon slug={i.slug} size={22} />
                        </span>
                        <span className="text-xs font-medium leading-tight">{i.label}</span>
                        {isSelected && (
                          <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ),
          )}
          {steps.every((s) => s.items.length === 0) && (
            <p className="text-sm text-ink/50">
              No wardrobe items to pick from yet — add some in your wardrobe first.
            </p>
          )}
        </div>

        {verdict && (
          <div className="mx-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-center text-sm">
            <p className="font-medium">
              {VERDICT_COPY[verdict.verdict].emoji} {VERDICT_COPY[verdict.verdict].title}
            </p>
            <p className="mt-1 text-xs text-ink/60">{VERDICT_COPY[verdict.verdict].body}</p>
          </div>
        )}

        <div data-native-bottom-bar className="px-6 pt-4 pb-[calc(1.5rem+var(--safe-area-bottom))]">
          <button
            onClick={checkOutfit}
            disabled={selected.size === 0}
            className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {verdict ? "Check again" : `Check outfit (${selected.size} selected)`}
          </button>
        </div>
      </div>
    </div>
  );
}
