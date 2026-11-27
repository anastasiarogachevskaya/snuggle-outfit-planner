import { type recommend } from "@/lib/recommend";
import { LABEL_BY_SLUG, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { useTempUnit } from "@/hooks/use-temp-unit";
import { localizeClothingText } from "@/lib/clothing-text";
import { ClothingIcon } from "@/components/icons";
import { missingItemNote, type SetAsideReason } from "@/lib/wardrobe-eligibility";
import type {
  ChangeGarment,
  LaterChange,
  LaterProtectionNeed,
  PackingItem,
} from "@/lib/recommend/outing-preparation";

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
  const preparation = rec.outingPreparation;
  const resultNotes = [...rec.notes, ...(preparation?.notes ?? [])];
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
        {resultNotes.length > 0 && (
          <div className="space-y-2 mb-6">
            {resultNotes.map((n, i) => (
              <p key={i} className="text-xs text-ink/70 border-l-2 border-accent/40 pl-3">
                {localizeClothingText(n, unit)}
              </p>
            ))}
          </div>
        )}

        <p className="text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
          {preparation ? "Wear now" : "Baby clothing"}
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

        {preparation && (preparation.changes.length > 0 || preparation.protection.length > 0) && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
              Later changes
            </p>
            <ul className="space-y-2">
              {preparation.changes.map((change) => (
                <li
                  key={laterChangeKey(change)}
                  className="text-sm text-ink/80 bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3"
                >
                  {laterChangeText(change, unit)}
                </li>
              ))}
              {preparation.protection.map((need) => (
                <li
                  key={laterProtectionKey(need)}
                  className="text-sm text-ink/80 bg-accent/5 border border-accent/10 rounded-2xl px-4 py-3"
                >
                  {laterProtectionText(need, unit)}
                </li>
              ))}
            </ul>
          </>
        )}

        {preparation && preparation.packing.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
              Take along
            </p>
            <div className="space-y-3">
              {preparation.packing.map((item) => (
                <Row
                  key={`pack-${item.category}-${item.slug}`}
                  slug={item.slug}
                  chip="PACK"
                  label={localizeClothingText(item.label, unit)}
                  sub={packingItemNote(item, unit)}
                  accent
                  dim={item.availability !== "available"}
                />
              ))}
            </div>
          </>
        )}

        {preparation?.spareSuggestion && (
          <p className="mt-4 text-xs text-ink/60 border-l-2 border-accent/40 pl-3">
            {localizeClothingText(preparation.spareSuggestion, unit)}
          </p>
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

type TextUnit = Parameters<typeof localizeClothingText>[1];
const changeName = (item: ChangeGarment, unit: TextUnit) =>
  localizeClothingText((item.usingLabel ?? item.label).toLowerCase(), unit);

function laterChangeKey(change: LaterChange): string {
  return `${change.kind}-${change.role}-${change.from?.slug ?? ""}-${change.to?.slug ?? ""}`;
}

function laterChangeText(change: LaterChange, unit: TextUnit): string {
  const timing = change.reasons.includes("rain") ? "Possible rain period" : "Later";
  if (change.kind === "replace" && change.from && change.to)
    return `${timing}: replace ${changeName(change.from, unit)} with ${changeName(change.to, unit)}.`;
  if (change.kind === "remove" && change.from)
    return `${timing}: remove ${changeName(change.from, unit)}.`;
  if (change.to) return `${timing}: add ${changeName(change.to, unit)}.`;
  return `${timing}: outfit change.`;
}

function laterProtectionKey(need: LaterProtectionNeed): string {
  return `${need.kind}-${need.slug}-${need.status}-${need.notLayeredOver}`;
}

function laterProtectionText(need: LaterProtectionNeed, unit: TextUnit): string {
  const name = localizeClothingText((LABEL_BY_SLUG[need.slug] ?? need.slug).toLowerCase(), unit);
  const status =
    need.status === "unmet" ? "is marked not waterproof" : "isn't confirmed waterproof";
  const subject = need.kind === "footwear" ? "Footwear later" : "Rain later";
  const layering = need.notLayeredOver
    ? " Layerly doesn't add a rain shell over this warm layer."
    : "";
  return `${subject}: your ${name} ${status}.${layering}`;
}

function packingItemNote(item: PackingItem, unit: TextUnit): string {
  const availability =
    item.availability === "available"
      ? undefined
      : item.availability === "not_owned"
        ? "Not in your wardrobe"
        : item.availability === "outgrown"
          ? "Marked outgrown in your wardrobe"
          : "Marked temporarily unavailable in your wardrobe";
  const protection =
    item.protection === "confirmed"
      ? "Waterproofing confirmed"
      : item.protection === "unconfirmed"
        ? "Waterproofing not confirmed"
        : item.protection === "unmet"
          ? "Marked not waterproof"
          : undefined;
  return [
    item.category === "transport" ? "For the ride" : undefined,
    item.usingLabel ? `Using your ${localizeClothingText(item.usingLabel, unit)}` : undefined,
    availability,
    protection,
    item.notLayeredOver ? "No rain shell stacked over it" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
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
