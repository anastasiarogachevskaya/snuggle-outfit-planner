import { useEffect, useMemo, useRef, useState } from "react";
import { ITEM_BY_SLUG, LABEL_BY_SLUG, warmthTagClasses, type WardrobeSlug } from "@/lib/wardrobe-catalog";
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

export type PanelWeather = {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  windKph: number;
};

const VERDICT_COPY: Record<OutfitVerdict, { title: string; body: string }> = {
  too_cold: {
    title: "A bit too light",
    body: "Baby would likely feel cold out there. Add a layer below.",
  },
  just_right: {
    title: "Just right!",
    body: "This combination should keep baby comfortable in today's weather.",
  },
  too_warm: {
    title: "A bit too warm",
    body: "That's more than today needs — baby may overheat. Drop a layer below.",
  },
};

// Verdict card colours, all from Layerly's own tokens.
const VERDICT_CARD: Record<OutfitVerdict, string> = {
  too_cold: "bg-ink text-canvas shadow-ink/20",
  just_right: "bg-primary text-primary-foreground shadow-primary/20",
  too_warm: "bg-accent text-accent-foreground shadow-accent/20",
};

const ROW = "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]";
const CHIP_BASE =
  "min-h-11 shrink-0 rounded-2xl px-5 text-[13px] transition-all duration-150 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";
const CHIP_DEFAULT = `${CHIP_BASE} border border-black/10 bg-surface font-medium text-ink/60`;
const CHIP_SELECTED = `${CHIP_BASE} border-2 border-primary bg-surface font-semibold text-primary shadow-sm`;
const CHIP_REMOVE = `${CHIP_BASE} border-2 border-destructive bg-surface font-semibold text-destructive ring-2 ring-destructive/20`;
const CHIP_SUGGESTED = `${CHIP_BASE} border-2 border-dashed border-primary bg-surface font-medium text-primary`;

const SLOT_LABEL = "mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.15em] text-accent";

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
  // "None" stays plainly selected even when the row needs an addition — the
  // dashed hint belongs on the garment to add, not on the empty option.
  const noneClassName = value === "none" ? CHIP_SELECTED : CHIP_DEFAULT;

  return (
    <section>
      <div className="flex items-center gap-2">
        <h3 className={SLOT_LABEL}>{label}</h3>
        {adjustment && (
          <span
            className={
              "mb-3 text-[10px] font-semibold uppercase tracking-wide " +
              (adjustment.type === "add" ? "text-primary" : "text-destructive")
            }
          >
            {adjustment.type === "add" ? "Add" : "Remove"}
          </span>
        )}
      </div>
      <div className={ROW}>
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
          const item = ITEM_BY_SLUG[slug];
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
              className={className + (label === "Mid layer" ? " py-2.5" : "")}
            >
              <span className="block">{LABEL_BY_SLUG[slug]}</span>
              {label === "Mid layer" && item.warmth && (
                <span
                  className={
                    "mt-0.5 block text-[9px] font-medium " + warmthTagClasses(item.warmth)
                  }
                >
                  {item.warmth} · {item.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** A white tile with a small switch — on state tinted with the sage token. */
function ToggleTile({
  label,
  value,
  onChange,
  adjustment,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  adjustment?: Pick<SlotAdjustment, "type">;
}) {
  const highlight = adjustment
    ? adjustment.type === "add"
      ? " ring-2 ring-primary/40"
      : " ring-2 ring-destructive/40"
    : "";
  return (
    <button
      onClick={() => {
        selectionHaptic();
        onChange(!value);
      }}
      aria-pressed={value}
      className={
        "flex min-h-14 items-center justify-between gap-2 rounded-2xl border p-4 text-left transition-colors duration-150 motion-reduce:transition-none " +
        (value
          ? "border-primary/20 bg-primary/5"
          : "border-black/5 bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.02)]") +
        highlight
      }
    >
      <span
        className={"text-[12px] font-semibold " + (value ? "text-primary" : "text-ink/80")}
      >
        {label}
      </span>
      <span
        className={
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none " +
          (value ? "bg-primary" : "bg-ink/15")
        }
      >
        <span
          className={
            "absolute top-0.5 size-4 rounded-full bg-surface shadow-sm transition-all duration-150 motion-reduce:transition-none " +
            (value ? "left-[1.125rem]" : "left-0.5")
          }
        />
      </span>
    </button>
  );
}

function isEmptyOutfit(o: ActualOutfit): boolean {
  return (
    o.bodysuit === "none" &&
    o.sleepsuit === "none" &&
    o.bottom === "none" &&
    o.mid === "none" &&
    o.outer === "none" &&
    o.hat === "none" &&
    o.socks === "none" &&
    !o.snowPants &&
    !o.mittens &&
    o.transportExtras.length === 0
  );
}

/**
 * Replaces the recommendation card in place (not a modal — a bottom sheet
 * doesn't behave well in the iOS WKWebView). Each slot is a single choice,
 * mirroring recommend()'s own LayerNeed/AccessoryNeed shape, and the verdict
 * recomputes on every tap instead of behind a "check" button.
 */
export function CheckOutfitPanel({
  rec,
  owned,
  weather,
  onBack,
}: {
  rec: Recommendation;
  owned: Set<WardrobeSlug>;
  weather?: PanelWeather;
  onBack: () => void;
}) {
  const [actual, setActual] = useState<ActualOutfit>(EMPTY_OUTFIT);

  const owns = (slugs: WardrobeSlug[]) => slugs.filter((s) => owned.has(s));

  const set = <K extends keyof ActualOutfit>(key: K, value: ActualOutfit[K]) =>
    setActual((prev) => ({ ...prev, [key]: value }));

  const toggleTransportExtra = (slug: WardrobeSlug) =>
    setActual((prev) => ({
      ...prev,
      transportExtras: prev.transportExtras.includes(slug)
        ? prev.transportExtras.filter((s) => s !== slug)
        : [...prev.transportExtras, slug],
    }));

  // Nothing picked yet isn't "too cold" — it's just an unanswered question.
  const started = !isEmptyOutfit(actual);
  const result = useMemo(
    () => (started ? compareOutfits(idealOutfitFrom(rec), actual) : null),
    [started, rec, actual],
  );

  // Buzz only when the verdict actually changes, not on every tap.
  const prevVerdict = useRef<OutfitVerdict | null>(null);
  useEffect(() => {
    const v = result?.verdict ?? null;
    if (v === prevVerdict.current) return;
    if (v === "just_right") successHaptic();
    else if (v && prevVerdict.current) warningHaptic();
    prevVerdict.current = v;
  }, [result?.verdict]);

  const adjustmentBySlot: Partial<Record<SlotKey, SlotAdjustment>> = {};
  for (const a of result?.adjustments ?? []) adjustmentBySlot[a.slot] = a;

  const baseCopy = result ? VERDICT_COPY[result.verdict] : null;
  // Warmth can check out while a hat/mittens/socks are still missing — say so
  // instead of a bare "Just right!".
  const copy =
    baseCopy && result?.verdict === "just_right" && result.adjustments.length > 0
      ? {
          title: "Almost there",
          body: "The layers look right — just add the highlighted items below before heading out.",
        }
      : baseCopy;

  return (
    <section className="mb-10">
      <div className="w-full max-w-full overflow-hidden rounded-[32px] border border-black/5 bg-surface p-6 shadow-sm">
        <button
          onClick={() => {
            lightHaptic();
            onBack();
          }}
          className="mb-4 text-xs font-medium text-primary"
        >
          ← Back to recommendation
        </button>

        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl font-semibold leading-none">Layer up</h1>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              Outfit picker
            </p>
          </div>
          {weather && (
            <div className="shrink-0 text-right">
              <div className="text-2xl font-semibold tracking-tight">
                {Math.round(weather.tempC)}°
              </div>
              <div className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-accent">
                Feels like {Math.round(weather.feelsLikeC)}° · {Math.round(weather.windKph)}km/h
              </div>
            </div>
          )}
        </header>

        {/* Live verdict */}
        <div
          aria-live="polite"
          className={
            "mb-8 rounded-[2rem] p-5 transition-colors duration-300 motion-reduce:transition-none " +
            (result
              ? `shadow-lg ${VERDICT_CARD[result.verdict]}`
              : "border border-dashed border-primary/25 bg-primary/5 text-ink")
          }
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              Current verdict
            </span>
            {result && (
              <span className="flex items-center gap-1.5 opacity-90">
                <span className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
              </span>
            )}
          </div>
          {copy ? (
            <>
              <p className="text-xl font-semibold leading-tight">{copy.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed opacity-90">{copy.body}</p>
            </>
          ) : (
            <>
              <p className="text-xl font-semibold leading-tight">Start picking</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink/60">
                Choose what baby's wearing and we'll check it against today's weather as you go.
              </p>
            </>
          )}
        </div>

        <div className="space-y-7">
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
          <p className="-mt-4 ml-1 text-[11px] leading-relaxed text-ink/50">
            <span className="font-semibold text-ink/65">What counts? </span>
            Light merino is thin, smooth jersey worn over a bodysuit. Warm wool is thick knit or
            boiled wool.
          </p>
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

          {(owned.has("snow_pants") || owned.has("mittens")) && (
            <section>
              <h3 className={SLOT_LABEL}>Extras</h3>
              <div className="grid grid-cols-2 gap-3">
                {owned.has("snow_pants") && (
                  <ToggleTile
                    label="Snow pants"
                    value={actual.snowPants}
                    onChange={(v) => set("snowPants", v)}
                    adjustment={adjustmentBySlot.snowPants}
                  />
                )}
                {owned.has("mittens") && (
                  <ToggleTile
                    label="Mittens"
                    value={actual.mittens}
                    onChange={(v) => set("mittens", v)}
                    adjustment={adjustmentBySlot.mittens}
                  />
                )}
              </div>
            </section>
          )}

          {rec.transportExtras.length > 0 && (
            <section>
              <h3 className={SLOT_LABEL}>Transport extras</h3>
              <div className="grid grid-cols-2 gap-3">
                {rec.transportExtras.map((e) => (
                  <ToggleTile
                    key={e.slug}
                    label={e.label}
                    value={actual.transportExtras.includes(e.slug)}
                    onChange={() => toggleTransportExtra(e.slug)}
                    adjustment={
                      result?.missingTransportExtras.includes(e.slug) ? { type: "add" } : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <button
          onClick={() => {
            lightHaptic();
            onBack();
          }}
          className="mt-8 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-md shadow-primary/20 transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Done
        </button>
      </div>
    </section>
  );
}
