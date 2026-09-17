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
} from "@/lib/recommend/warmth";
import { lightHaptic, selectionHaptic, successHaptic, warningHaptic } from "@/lib/haptics";

const VERDICT_COPY: Record<OutfitVerdict, { emoji: string; title: string }> = {
  too_cold: { emoji: "🥶", title: "A bit too light for today" },
  just_right: { emoji: "😊", title: "Just right for today" },
  too_warm: { emoji: "🥵", title: "A bit too warm for today" },
};

/** A single-select row of pill buttons, plus a "None" option, for one outfit slot. */
function SlotRow<T extends WardrobeSlug | "none">({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: WardrobeSlug[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary/60">{label}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            selectionHaptic();
            onChange("none" as T);
          }}
          aria-pressed={value === "none"}
          className={
            "min-h-9 rounded-xl px-3 text-xs " +
            (value === "none" ? "bg-primary/15 font-medium text-primary" : "bg-canvas text-ink/60")
          }
        >
          None
        </button>
        {options.map((slug) => (
          <button
            key={slug}
            onClick={() => {
              selectionHaptic();
              onChange(slug as T);
            }}
            aria-pressed={value === slug}
            className={
              "min-h-9 rounded-xl px-3 text-xs " +
              (value === slug ? "bg-primary/15 font-medium text-primary" : "bg-canvas text-ink/60")
            }
          >
            {LABEL_BY_SLUG[slug]}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => {
        selectionHaptic();
        onChange(!value);
      }}
      aria-pressed={value}
      className={
        "min-h-9 rounded-xl px-3 text-xs " +
        (value ? "bg-primary/15 font-medium text-primary" : "bg-canvas text-ink/60")
      }
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
 * LayerNeed/AccessoryNeed shape, so the comparison and the "add this,
 * remove that" guidance are both meaningful.
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

        <div className="space-y-5">
          <SlotRow
            label="Bodysuit"
            options={owns(BODYSUIT_SLUGS)}
            value={actual.bodysuit}
            onChange={(v) => set("bodysuit", v)}
          />
          <SlotRow
            label="Sleepsuit / romper"
            options={owns(SLEEPSUIT_SLUGS)}
            value={actual.sleepsuit}
            onChange={(v) => set("sleepsuit", v)}
          />
          <SlotRow
            label="Bottoms"
            options={owns(BOTTOM_SLUGS)}
            value={actual.bottom}
            onChange={(v) => set("bottom", v)}
          />
          <SlotRow
            label="Mid layer"
            options={owns(MID_SLUGS)}
            value={actual.mid}
            onChange={(v) => set("mid", v)}
          />
          <SlotRow
            label="Outer layer"
            options={owns(OUTER_SLUGS)}
            value={actual.outer}
            onChange={(v) => set("outer", v)}
          />
          <SlotRow
            label="Hat"
            options={owns(HAT_SLUGS)}
            value={actual.hat}
            onChange={(v) => set("hat", v)}
          />
          <SlotRow
            label="Socks"
            options={owns(SOCK_SLUGS)}
            value={actual.socks}
            onChange={(v) => set("socks", v)}
          />
          <div className="flex flex-wrap gap-2">
            {owned.has("snow_pants") && (
              <ToggleRow
                label="Snow pants"
                value={actual.snowPants}
                onChange={(v) => set("snowPants", v)}
              />
            )}
            {owned.has("mittens") && (
              <ToggleRow
                label="Mittens"
                value={actual.mittens}
                onChange={(v) => set("mittens", v)}
              />
            )}
          </div>
        </div>

        {result && (
          <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4">
            <p className="text-center font-medium">
              {VERDICT_COPY[result.verdict].emoji} {VERDICT_COPY[result.verdict].title}
            </p>
            {result.adjustments.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {result.adjustments.map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={a.type === "add" ? "text-primary" : "text-destructive"}>
                      {a.type === "add" ? "+" : "−"}
                    </span>
                    <span className="text-ink/70">
                      {a.type === "add" ? "Add " : "Remove "}
                      {a.label.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
