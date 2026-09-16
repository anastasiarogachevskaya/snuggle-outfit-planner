import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WARDROBE_STEPS, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { toast } from "sonner";
import { successHaptic, warningHaptic } from "@/lib/haptics";
import { logEvent } from "@/lib/analytics";
import { WardrobeSetup } from "@/components/wardrobe-setup";

export const Route = createFileRoute("/_authenticated/onboarding/wardrobe")({
  head: () => ({
    meta: [
      { title: "Wardrobe setup — Layerly" },
      {
        name: "description",
        content:
          "Quick two-minute setup: tell Layerly which baby clothes you own so recommendations match your drawer.",
      },
      { property: "og:title", content: "Wardrobe setup — Layerly" },
      { property: "og:url", content: "https://layerly.online/onboarding/wardrobe" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/onboarding/wardrobe" }],
  }),
  component: OnboardingWardrobe,
});

function OnboardingWardrobe() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const babyQ = useQuery({
    queryKey: ["baby"],
    queryFn: async () => {
      const { data, error } = await supabase.from("babies").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const persist = async (slugs: WardrobeSlug[]) => {
    if (!babyQ.data) {
      toast.error("Baby profile not found");
      return;
    }
    const babyId = babyQ.data.id;
    setSaving(true);
    try {
      // Write the whole catalog, not just the ticked items. A guest who
      // converts already has default rows marked owned, so upserting only
      // the selection left anything they un-ticked still marked as owned.
      const selected = new Set<string>(slugs);
      const rows = WARDROBE_STEPS.flatMap((step) =>
        step.items.map((item) => ({
          baby_id: babyId,
          slug: item.slug,
          owned: selected.has(item.slug),
        })),
      );
      const { error } = await supabase
        .from("wardrobe_items")
        .upsert(rows, { onConflict: "baby_id,slug" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["wardrobe"] });
      logEvent("wardrobe_saved", { items: slugs.length });
      successHaptic();
      toast.success("Wardrobe saved");
      navigate({ to: "/today" });
    } catch (e: any) {
      warningHaptic();
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WardrobeSetup saving={saving} onSave={persist} onSkip={() => navigate({ to: "/today" })} />
  );
}
