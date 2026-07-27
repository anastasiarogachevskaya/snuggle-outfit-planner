import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  WARDROBE_STEPS,
  QUICK_SETUP_OWNED,
  type WardrobeSlug,
} from "@/lib/wardrobe-catalog";
import { toast } from "sonner";
import { ClothingIcon } from "@/components/icons";

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

type Mode = "chooser" | "quick" | "detailed";

function OnboardingWardrobe() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const babyQ = useQuery({
    queryKey: ["baby"],
    queryFn: async () => {
      const { data, error } = await supabase.from("babies").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [mode, setMode] = useState<Mode>("chooser");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<WardrobeSlug>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "quick") setSelected(new Set(QUICK_SETUP_OWNED));
  }, [mode]);

  const toggle = (slug: WardrobeSlug) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const persist = async (slugs: WardrobeSlug[]) => {
    if (!babyQ.data) {
      toast.error("Baby profile not found");
      return;
    }
    setSaving(true);
    try {
      const rows = slugs.map((slug) => ({ baby_id: babyQ.data!.id, slug, owned: true }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from("wardrobe_items")
          .upsert(rows, { onConflict: "baby_id,slug" });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["wardrobe"] });
      toast.success("Wardrobe saved");
      navigate({ to: "/today" });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const skip = () => navigate({ to: "/today" });

  // Chooser
  if (mode === "chooser") {
    return (
      <Shell title="Wardrobe" subtitle="Let's set up your baby's wardrobe in 2 minutes.">
        <div className="mt-8 space-y-3">
          <ChoiceCard
            title="Quick setup"
            desc="We'll preselect common basics. Edit from there."
            onClick={() => setMode("quick")}
          />
          <ChoiceCard
            title="Detailed setup"
            desc="Go category by category. About 2 minutes."
            onClick={() => setMode("detailed")}
          />
          <ChoiceCard title="Skip for now" desc="You can set this up later." onClick={skip} muted />
        </div>
        <FooterNote />
      </Shell>
    );
  }

  // Quick: single page with all items, preselected
  if (mode === "quick") {
    return (
      <Shell title="Quick setup" subtitle="We preselected common items. Tap to adjust.">
        <div className="mt-6 space-y-6">
          {WARDROBE_STEPS.map((s) => (
            <section key={s.id}>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/60 mb-3">
                {s.title}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {s.items.map((i) => (
                  <Tile
                    key={i.slug}
                    label={i.label}
                    hint={i.hint}
                    emoji={i.emoji}
                    slug={i.slug}
                    selected={selected.has(i.slug)}
                    onClick={() => toggle(i.slug)}
                    compact
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        <FooterNote />
        <div className="mt-6 sticky bottom-[calc(var(--safe-area-bottom)+1rem)]">
          <button
            onClick={() => persist(Array.from(selected))}
            disabled={saving}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-4 font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : `Save ${selected.size} items`}
          </button>
        </div>
      </Shell>
    );
  }

  // Detailed: paginated steps
  const total = WARDROBE_STEPS.length;
  const current = WARDROBE_STEPS[step];
  const isLast = step === total - 1;

  return (
    <Shell title={current.title} subtitle={current.question}>
      <div className="mt-4 flex items-center gap-2">
        {WARDROBE_STEPS.map((_, i) => (
          <div
            key={i}
            className={
              "h-1 flex-1 rounded-full " +
              (i <= step ? "bg-primary" : "bg-black/10")
            }
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-ink/40">
        Step {step + 1} of {total}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {current.items.map((i) => (
          <Tile
            key={i.slug}
            label={i.label}
            hint={i.hint}
            emoji={i.emoji}
            slug={i.slug}
            selected={selected.has(i.slug)}
            onClick={() => toggle(i.slug)}
          />
        ))}
      </div>

      <FooterNote />

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 rounded-2xl border border-black/10 py-3 text-sm font-medium"
          >
            Back
          </button>
        )}
        {!isLast ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex-[2] rounded-2xl bg-primary text-primary-foreground py-3 font-medium shadow-md shadow-primary/20"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => persist(Array.from(selected))}
            disabled={saving}
            className="flex-[2] rounded-2xl bg-primary text-primary-foreground py-3 font-medium shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Finish"}
          </button>
        )}
      </div>
      <button onClick={skip} className="mt-3 w-full text-xs text-ink/40">
        Skip for now
      </button>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-md px-6 py-8 pb-24">
        <p className="text-xs font-medium uppercase tracking-widest text-primary/70 mb-2">
          Wardrobe setup
        </p>
        <h1 className="text-3xl font-serif font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-ink/60 text-sm">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function ChoiceCard({
  title,
  desc,
  onClick,
  muted,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full text-left p-5 rounded-2xl border transition-colors " +
        (muted
          ? "bg-canvas/60 border-black/5 text-ink/70"
          : "bg-surface border-black/5 hover:border-primary/30")
      }
    >
      <p className="font-medium">{title}</p>
      <p className="text-xs text-ink/50 mt-1">{desc}</p>
    </button>
  );
}

function Tile({
  label,
  hint,
  emoji: _emoji,
  slug,
  selected,
  onClick,
  compact,
}: {
  label: string;
  hint: string;
  emoji: string;
  slug: WardrobeSlug;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "relative text-left rounded-2xl border transition-all " +
        (compact ? "p-3 " : "p-4 ") +
        (selected
          ? "bg-primary/5 border-primary shadow-sm"
          : "bg-surface border-black/5 hover:border-black/20")
      }
    >
      {selected && (
        <span className="absolute top-2 right-2 size-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
          ✓
        </span>
      )}
      <div className={(compact ? "mb-1 " : "mb-2 ") + (selected ? "text-primary" : "text-ink/60")}>
        <ClothingIcon slug={slug} size={compact ? 28 : 34} />
      </div>
      <p className={"font-medium leading-tight " + (compact ? "text-xs" : "text-sm")}>
        {label}
      </p>
      <p className="text-[10px] text-ink/40 mt-0.5">{hint}</p>
    </button>
  );
}

function FooterNote() {
  return (
    <p className="mt-8 text-center text-xs text-ink/40">
      Not sure? You can change this later.
    </p>
  );
}
