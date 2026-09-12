import { type recommend } from "@/lib/recommend";
import { type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { ClothingIcon } from "@/components/icons";

/**
 * The row label names the layer kind ("Sleeveless bodysuit"); when the engine
 * matched a stand-in instead, say which garment that actually is.
 */
function usingHint(usingLabel: string | undefined) {
  return usingLabel ? `Using your ${usingLabel.toLowerCase()}` : "";
}

export function OutfitResult({
  rec,
  owned,
  onOpenWardrobe,
}: {
  rec: NonNullable<ReturnType<typeof recommend>>;
  owned: Set<WardrobeSlug>;
  onOpenWardrobe: () => void;
}) {
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
        <p className="text-ink/60 leading-relaxed mb-4">{rec.reason}</p>
        {rec.notes.length > 0 && (
          <div className="space-y-2 mb-6">
            {rec.notes.map((n, i) => (
              <p key={i} className="text-xs text-ink/70 border-l-2 border-accent/40 pl-3">
                {n}
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
                chip={l.slot.slice(0, 3).toUpperCase()}
                label={l.label}
                hint={
                  isSynthetic
                    ? ""
                    : isOwned
                      ? usingHint(l.usingLabel) || "In your wardrobe"
                      : "Not in your wardrobe"
                }
                dim={!isSynthetic && !isOwned}
              />
            );
          })}
          {rec.accessories.map((a) => (
            <Row
              key={"acc-" + a.slug}
              slug={a.slug}
              chip="+"
              label={a.label}
              hint={owned.has(a.slug) ? usingHint(a.usingLabel) : "Not in your wardrobe"}
              accent
              dim={!owned.has(a.slug)}
            />
          ))}
        </div>

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
                  label={a.label}
                  hint="From your wardrobe"
                />
              ))}
            </div>
          </>
        )}

        {rec.transportExtras.length > 0 && (
          <>
            <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-primary/60 mb-2">
              Transport extras
            </p>
            <div className="space-y-3">
              {rec.transportExtras.map((a) => (
                <Row
                  key={"tx-" + a.slug}
                  slug={a.slug}
                  chip="+"
                  label={a.label}
                  hint="From your wardrobe"
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
                  {s}
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
                  label={a.label}
                  hint="Not in your wardrobe"
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
  hint,
  accent,
  dim,
  slug,
}: {
  chip: string;
  label: string;
  hint?: string;
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
        {hint && <p className="text-[11px] text-ink/40">{hint}</p>}
      </div>
    </div>
  );
}
