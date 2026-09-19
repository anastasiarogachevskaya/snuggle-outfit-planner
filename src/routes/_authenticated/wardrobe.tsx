import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WARDROBE_CATALOG, warmthTagClasses, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { toast } from "sonner";
import { ClothingIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { selectionHaptic, warningHaptic } from "@/lib/haptics";

export const Route = createFileRoute("/_authenticated/wardrobe")({
  head: () => ({
    meta: [
      { title: "Wardrobe checklist — Layerly" },
      {
        name: "description",
        content:
          "Tick everything you own so Layerly only recommends baby clothes that are actually in your drawer.",
      },
      { property: "og:title", content: "Wardrobe checklist — Layerly" },
      { property: "og:url", content: "https://layerly.online/wardrobe" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/wardrobe" }],
  }),
  component: WardrobePage,
});

function WardrobePage() {
  const qc = useQueryClient();

  const babyQ = useQuery({
    queryKey: ["baby"],
    queryFn: async () => {
      const { data, error } = await supabase.from("babies").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const wardrobeQ = useQuery({
    queryKey: ["wardrobe", babyQ.data?.id],
    enabled: !!babyQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wardrobe_items")
        .select("slug,owned")
        .eq("baby_id", babyQ.data!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ownedMap = useMemo(() => {
    const m = new Map<string, boolean>();
    (wardrobeQ.data ?? []).forEach((i) => m.set(i.slug, i.owned));
    return m;
  }, [wardrobeQ.data]);

  const wardrobeKey = ["wardrobe", babyQ.data?.id];
  type WardrobeRow = { slug: string; owned: boolean };

  const toggle = useMutation({
    mutationFn: async ({ slug, owned }: { slug: WardrobeSlug; owned: boolean }) => {
      if (!babyQ.data) return;
      const { error } = await supabase
        .from("wardrobe_items")
        .upsert({ baby_id: babyQ.data.id, slug, owned }, { onConflict: "baby_id,slug" });
      if (error) throw error;
    },
    // Tick the box straight away. Over a slow connection the old version sat
    // unchanged until the round trip finished, which read as a dead button
    // and invited a second tap.
    onMutate: async ({ slug, owned }) => {
      await qc.cancelQueries({ queryKey: wardrobeKey });
      const previous = qc.getQueryData<WardrobeRow[]>(wardrobeKey);
      qc.setQueryData<WardrobeRow[]>(wardrobeKey, (rows = []) =>
        rows.some((r) => r.slug === slug)
          ? rows.map((r) => (r.slug === slug ? { ...r, owned } : r))
          : [...rows, { slug, owned }],
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) qc.setQueryData(wardrobeKey, context.previous);
      warningHaptic();
      toast.error(e.message ?? "Update failed");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["wardrobe"] }),
  });

  if (babyQ.isLoading) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden bg-canvas p-6 font-sans">
        <Link to="/today" className="text-sm text-ink/60">
          ← Today
        </Link>
        <p className="mt-8 text-sm text-ink/40">Loading…</p>
      </div>
    );
  }

  if (!babyQ.data) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden bg-canvas p-6 font-sans">
        <Link to="/today" className="text-sm text-ink/60">
          ← Today
        </Link>
        {babyQ.isError ? (
          <>
            <p className="mt-8 text-ink/60">
              Couldn't load your profile. Check your connection and try again.
            </p>
            <button
              onClick={() => babyQ.refetch()}
              className="mt-4 inline-block font-medium text-primary"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <p className="mt-8 text-ink/60">Set up a baby profile first.</p>
            <Link to="/baby" className="mt-4 inline-block font-medium text-primary">
              Baby profile →
            </Link>
          </>
        )}
      </div>
    );
  }

  const groups = Array.from(new Set(WARDROBE_CATALOG.map((i) => i.group)));

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-canvas font-sans text-ink">
      <div className="mx-auto w-full max-w-md min-w-0 px-6 py-8">
        <Link to="/baby" className="text-sm text-ink/60">
          ← Baby profile
        </Link>
        <h1 className="mt-6 text-3xl font-serif font-semibold">Wardrobe</h1>
        <p className="mt-2 text-ink/60 text-sm">
          Tick everything you own. Layerly only recommends clothes you actually have.
        </p>

        <div className="mt-8 space-y-8">
          {groups.map((g) => (
            <section key={g}>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/60 mb-3">
                {g}
              </p>
              <div className="space-y-2">
                {WARDROBE_CATALOG.filter((i) => i.group === g).map((item) => {
                  const owned = ownedMap.get(item.slug) ?? false;
                  return (
                    <button
                      key={item.slug}
                      onClick={() => {
                        selectionHaptic();
                        toggle.mutate({ slug: item.slug as WardrobeSlug, owned: !owned });
                      }}
                      aria-pressed={owned}
                      className={
                        "w-full min-w-0 flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left " +
                        (owned
                          ? "bg-surface border-primary/30"
                          : "bg-canvas/60 border-black/5 opacity-60")
                      }
                    >
                      <div
                        className={
                          "size-6 shrink-0 rounded-full flex items-center justify-center text-xs " +
                          (owned
                            ? "bg-primary text-primary-foreground"
                            : "bg-white border border-black/10")
                        }
                      >
                        {owned ? "✓" : ""}
                      </div>
                      <span
                        className={
                          "inline-flex shrink-0 items-center justify-center " +
                          (owned ? "text-primary" : "text-ink/50")
                        }
                      >
                        <ClothingIcon slug={item.slug as WardrobeSlug} size={22} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="break-words text-sm font-medium">{item.label}</span>
                          {item.warmth && (
                            <span
                              className={
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                                warmthTagClasses(item.warmth)
                              }
                            >
                              {item.warmth}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-ink/55">
                          {item.hint}
                        </span>
                        {item.explanation && (
                          <span className="mt-1 block text-[11px] leading-snug text-ink/45">
                            <span className="font-semibold text-ink/60">What counts? </span>
                            {item.explanation}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <SiteFooter className="mt-14" />
      </div>
    </div>
  );
}
