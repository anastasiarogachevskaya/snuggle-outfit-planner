import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WARDROBE_CATALOG, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wardrobe")({
  head: () => ({ meta: [{ title: "Wardrobe — Layer" }] }),
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

  const toggle = useMutation({
    mutationFn: async ({ slug, owned }: { slug: WardrobeSlug; owned: boolean }) => {
      if (!babyQ.data) return;
      const { error } = await supabase
        .from("wardrobe_items")
        .upsert(
          { baby_id: babyQ.data.id, slug, owned },
          { onConflict: "baby_id,slug" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wardrobe"] }),
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  if (!babyQ.data) {
    return (
      <div className="min-h-screen bg-canvas font-sans p-6 max-w-md mx-auto">
        <Link to="/today" className="text-sm text-ink/60">← Today</Link>
        <p className="mt-8 text-ink/60">Set up a baby profile first.</p>
        <Link to="/baby" className="mt-4 inline-block text-primary font-medium">Baby profile →</Link>
      </div>
    );
  }

  const groups = Array.from(new Set(WARDROBE_CATALOG.map((i) => i.group)));

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-md px-6 py-8">
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
                      onClick={() =>
                        toggle.mutate({ slug: item.slug as WardrobeSlug, owned: !owned })
                      }
                      className={
                        "w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left " +
                        (owned
                          ? "bg-surface border-primary/30"
                          : "bg-canvas/60 border-black/5 opacity-60")
                      }
                    >
                      <div
                        className={
                          "size-6 rounded-full flex items-center justify-center text-xs " +
                          (owned
                            ? "bg-primary text-primary-foreground"
                            : "bg-white border border-black/10")
                        }
                      >
                        {owned ? "✓" : ""}
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
