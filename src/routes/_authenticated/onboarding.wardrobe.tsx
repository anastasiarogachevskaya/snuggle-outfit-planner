import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WARDROBE_STEPS, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { toast } from "sonner";
import { successHaptic, warningHaptic } from "@/lib/haptics";
import { logEvent } from "@/lib/analytics";
import { WardrobeSetup } from "@/components/wardrobe-setup";
import { isNewWardrobe, ownedSlugs, wardrobeChanges, type StoredWardrobeRow } from "@/lib/wardrobe-diff";

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
  const [saveError, setSaveError] = useState<string | null>(null);

  const babyQ = useQuery({
    queryKey: ["baby"],
    queryFn: async () => {
      const { data, error } = await supabase.from("babies").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const babyId = babyQ.data?.id;

  // The parent's saved wardrobe must load before setup starts, so starter
  // basics can never replace real clothing.
  const rowsQ = useQuery({
    queryKey: ["wardrobe-setup-rows", babyId],
    enabled: !!babyId,
    retry: 1,
    staleTime: Infinity,
    queryFn: async (): Promise<StoredWardrobeRow[]> => {
      const { data, error } = await supabase
        .from("wardrobe_items")
        .select("slug, owned")
        .eq("baby_id", babyId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const persist = async (slugs: WardrobeSlug[]) => {
    if (!babyId || !rowsQ.isSuccess) return;
    const visible = WARDROBE_STEPS.flatMap((s) => s.items.map((i) => i.slug));
    const changes = wardrobeChanges(rowsQ.data, slugs, visible);
    setSaving(true);
    setSaveError(null);
    try {
      if (changes.length > 0) {
        const { error } = await supabase
          .from("wardrobe_items")
          .upsert(
            changes.map((c) => ({ baby_id: babyId, ...c })),
            { onConflict: "baby_id,slug" },
          );
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["wardrobe"] });
      qc.removeQueries({ queryKey: ["wardrobe-setup-rows"] });
      logEvent("wardrobe_saved", { items: slugs.length });
      successHaptic();
      toast.success("Wardrobe saved");
      navigate({ to: "/today" });
    } catch (e) {
      warningHaptic();
      const msg = "Your wardrobe wasn't saved. Your choices are still here — please try again.";
      setSaveError(msg);
      toast.error(msg);
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (babyQ.isError || rowsQ.isError || (babyQ.isSuccess && !babyQ.data)) {
    const noBaby = babyQ.isSuccess && !babyQ.data;
    return (
      <StatusScreen
        message={noBaby ? "We couldn't find your baby's profile." : "We couldn't load your saved wardrobe."}
        onRetry={noBaby ? undefined : () => (babyQ.isError ? babyQ.refetch() : rowsQ.refetch())}
      />
    );
  }
  if (!rowsQ.isSuccess) return <StatusScreen message="Loading your wardrobe…" />;

  return (
    <>
      <WardrobeSetup
        initialSelected={ownedSlugs(rowsQ.data) as WardrobeSlug[]}
        starterBasics={isNewWardrobe(rowsQ.data)}
        saving={saving}
        onSave={persist}
        onSkip={() => navigate({ to: "/today" })}
      />
      {saveError && (
        <div role="alert" className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl bg-destructive px-4 py-3 text-sm text-destructive-foreground shadow-lg">
          {saveError}
        </div>
      )}
    </>
  );
}

function StatusScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-sm text-ink/60" role="status">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
