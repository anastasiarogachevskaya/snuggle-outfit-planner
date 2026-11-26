import { type recommend } from "@/lib/recommend";
import { LABEL_BY_SLUG, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { useTempUnit } from "@/hooks/use-temp-unit";
import { localizeClothingText } from "@/lib/clothing-text";
import { ClothingIcon } from "@/components/icons";
import { missingItemNote, type SetAsideReason } from "@/lib/wardrobe-eligibility";

export function OutfitResult({
  rec,
  owned,
  setAside,
  onOpenWardrobe,
}: {
  rec: NonNullable<ReturnType<typeof recommend>>;
  owned: Set<WardrobeSlug>;
  setAside?: ReadonlyMap<WardrobeSlug, SetAsideReason>;
  onOpenWardrobe: () => void;
}) {
  const [unit] = useTempUnit();
  // Walking footwear is its own role (T14): shown apart from socks/accessories.
  const fw = rec.footwear;
  const footwearSlug = fw ? (fw.selected ?? fw.missingSlug) : null;
  const accessories = rec.accessories.filter((a) => a.slug !== footwearSlug);
  const footwearItem = footwearSlug
    ? rec.accessories.find((a) => a.slug === footwearSlug)
    : undefined;
  const rainAdded = new Set<string>(rec.rainProtection?.added ?? []);
  const openNeeds = protectionNeeds(rec, unit);
  return (
    <section className="mb-10">
      <div className="w-full max-w-full overflow-hidden bg-surface rounded-[32px] p-7 shadow-sm border border-black/5">
        <h1 className="text-3xl font-serif font-semibold mb-2">
          {rec.babyClothing.length >= 3
            ? "Go with layers."
            : rec.babyClothing.length === 2
              ? "Keep it light."
              : "Just the basics."}
        </h1>
        <p className="text-ink/60 leading-relaxed mb-4">{localizeClothingText(rec.reason, unit)}</p>
        {rec.notes.length > 0 && (
          <div className="space-y-2 mb-6">
            {rec.notes.map((n, i) => (
              <p key={i} className="text-xs text-ink/70 border-l-2 border-accent/40 pl-3">
                {localizeClothingText(n, unit)}
              </p>
            ))}
          </div>
        )}

        <p className="text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
          Baby clothing
        </p>
        <div className="space-y-3">
          {rec.babyClothing.map((l) => {
            const isSynthetic = l.slug === "diaper_only";
            const isOwned = !isSynthetic && owned.has(l.slug as WardrobeSlug);
            return (
              <Row
                key={l.slot + l.slug}
                slug={isSynthetic ? undefined : (l.slug as WardrobeSlug)}
                chip={l.slot === "thermal" ? "THM" : l.slot.slice(0, 3).toUpperCase()}
                label={localizeClothingText(l.label, unit)}
                sub={
                  [
                    rainAdded.has(l.slug) ? "Rain layer" : undefined,
                    l.usingLabel
                      ? `Using your ${localizeClothingText(l.usingLabel, unit)}`
                      : !isSynthetic && !isOwned
                        ? missingItemNote(l.slug as WardrobeSlug, setAside)
                        : undefined,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                dim={!isSynthetic && !isOwned}
              />
            );
          })}
          {accessories.map((a) => (
            <Row
              key={"acc-" + a.slug}
              slug={a.slug}
              chip="+"
              label={localizeClothingText(a.label, unit)}
              sub={
                a.usingLabel
                  ? `Using your ${localizeClothingText(a.usingLabel, unit)}`
                  : !owned.has(a.slug)
                    ? missingItemNote(a.slug, setAside)
                    : undefined
              }
              accent
              dim={!owned.has(a.slug)}
            />
          ))}
        </div>

        {footwearItem && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
              Footwear
            </p>
            <Row
              slug={footwearItem.slug}
              chip="FT"
              label={localizeClothingText(footwearItem.label, unit)}
              sub={
                footwearItem.usingLabel
                  ? `Using your ${localizeClothingText(footwearItem.usingLabel, unit)}`
                  : !owned.has(footwearItem.slug)
                    ? missingItemNote(footwearItem.slug, setAside)
                    : undefined
              }
              dim={!owned.has(footwearItem.slug)}
            />
          </>
        )}

        {openNeeds.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-accent/70 mb-2">
              Still open
            </p>
            <ul className="space-y-2">
              {openNeeds.map((n) => (
                <li
                  key={n}
                  className="text-sm text-ink/80 bg-accent/5 border border-accent/10 rounded-2xl px-4 py-3"
                >
                  {n}
                </li>
              ))}
            </ul>
          </>
        )}

        {rec.sleepAccessories.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
              Sleep accessories
            </p>
            <div className="space-y-3">
              {rec.sleepAccessories.map((a) => (
                <Row
                  key={"sleep-" + a.slug}
                  slug={a.slug}
                  chip="ZZ"
                  label={localizeClothingText(a.label, unit)}
                />
              ))}
            </div>
          </>
        )}

        {rec.transportExtras.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
              {rec.walkingWarmth ? "For the ride" : "Transport extras"}
            </p>
            {rec.walkingWarmth && (
              <p className="mb-2 text-xs text-ink/60">
                Equipment for the {rideName(rec.walkingWarmth.transport)}, not worn clothing. The
                clothes above are chosen for walking.
              </p>
            )}
            <div className="space-y-3">
              {rec.transportExtras.map((a) => (
                <Row
                  key={"tx-" + a.slug}
                  slug={a.slug}
                  chip="+"
                  label={localizeClothingText(a.label, unit)}
                />
              ))}
            </div>
          </>
        )}

        {rec.safetyAdvice.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-accent/70 mb-2">
              Weather safety
            </p>
            <div className="space-y-2">
              {rec.safetyAdvice.map((s, i) => (
                <p
                  key={i}
                  className="text-sm text-ink/80 bg-accent/5 border border-accent/10 rounded-2xl px-4 py-3"
                >
                  {localizeClothingText(s, unit)}
                </p>
              ))}
            </div>
          </>
        )}

        {rec.missingHelpfulItems.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-accent/70 mb-2">
              Suggested for next time
            </p>
            <div className="space-y-3">
              {rec.missingHelpfulItems.map((a) => (
                <Row
                  key={"miss-" + a.slug}
                  slug={a.slug}
                  chip="?"
                  label={localizeClothingText(a.label, unit)}
                  sub={setAside?.has(a.slug) ? missingItemNote(a.slug, setAside) : undefined}
                  accent
                  dim
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-ink/50">
              <button onClick={onOpenWardrobe} className="underline">
                Add to wardrobe
              </button>{" "}
              when you have them.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Row({
  chip,
  label,
  sub,
  accent,
  dim,
  slug,
}: {
  chip: string;
  label: string;
  sub?: string;
  accent?: boolean;
  dim?: boolean;
  slug?: WardrobeSlug;
}) {
  return (
    <div
      className={
        "flex min-w-0 items-center gap-4 p-3 bg-canvas/60 rounded-2xl " + (dim ? "opacity-60" : "")
      }
    >
      <div
        className={
          "size-10 shrink-0 bg-white rounded-lg border border-black/5 flex items-center justify-center " +
          (accent ? "text-accent" : "text-primary")
        }
      >
        {slug ? (
          <ClothingIcon slug={slug} size={22} />
        ) : (
          <span className="text-xs font-medium">{chip}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-medium">{label}</p>
        {sub && <p className="break-words text-xs text-ink/60">{sub}</p>}
      </div>
    </div>
  );
}

function rideName(t: string): string {
  return t === "sitting-stroller" ? "stroller" : t;
}

const STATUS_TEXT = {
  unconfirmed: "isn't confirmed waterproof",
  unmet: "is marked not waterproof",
} as const;

const AREA_TEXT: Record<string, string> = { upper_body: "upper body", lower_body: "legs" };

/** Unresolved protection from the shared output, worded for parents. Missing garments are already shown dimmed above. */
function protectionNeeds(
  rec: NonNullable<ReturnType<typeof recommend>>,
  unit: Parameters<typeof localizeClothingText>[1],
): string[] {
  const out: string[] = [];
  const name = (slug: string) =>
    localizeClothingText((LABEL_BY_SLUG[slug as WardrobeSlug] ?? slug).toLowerCase(), unit);
  for (const g of rec.footwear?.gaps ?? []) {
    if (g.kind === "waterproofing")
      out.push(`Waterproof footwear: your ${name(g.slug)} ${STATUS_TEXT[g.status]}.`);
    else if (g.waterproofRequired) out.push("Waterproof footwear: none available to use.");
  }
  for (const g of rec.rainProtection?.gaps ?? []) {
    const areas = g.areas.map((a) => AREA_TEXT[a] ?? a).join(" and ");
    if (g.kind === "waterproofing")
      out.push(`Rain cover for ${areas}: your ${name(g.slug)} ${STATUS_TEXT[g.status]}.`);
    else out.push(`Rain cover for ${areas}: no ${name(g.slug)} available to use.`);
  }
  return [...new Set(out.map((text) => localizeClothingText(text, unit)))];
}
