import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Layerly — What should baby wear today?" },
      {
        name: "description",
        content:
          "Layerly turns today's weather into a simple layered outfit for your baby, using clothes you already own.",
      },
      { property: "og:title", content: "Layerly — What should baby wear today?" },
      {
        property: "og:description",
        content:
          "Layerly turns today's weather into a simple layered outfit for your baby, using clothes you already own.",
      },
      { property: "og:url", content: "https://layerly.online/" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-10 font-sans">
        <header className="flex items-center justify-between mb-16">
          <span className="font-serif text-lg font-semibold">Layerly</span>
          <Link to="/auth" className="text-sm text-primary font-medium">
            Sign in
          </Link>
        </header>

        <section className="mb-12">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/70 mb-4">
            For the daily "what do I put on baby?"
          </p>
          <h1 className="text-4xl leading-tight font-serif font-semibold text-ink">
            One glance.
            <br />
            <span className="italic">Baby dressed right.</span>
          </h1>
          <p className="mt-5 text-ink/60 leading-relaxed">
            Layerly reads today's weather where you are, weighs your baby's temperature preference and the clothes you
            actually own, and answers the only question that matters at 7&nbsp;am.
          </p>
        </section>

        <div className="bg-surface rounded-[32px] p-6 shadow-sm border border-black/5 mb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/60 mb-3">
            Today &middot; feels like 9°
          </p>
          <h2 className="text-2xl font-serif font-semibold mb-3">Go with layers.</h2>
          <ul className="space-y-2 text-sm text-ink/80">
            <li>· Long-sleeve bodysuit</li>
            <li>· Ribbed leggings</li>
            <li>· Fleece overall</li>
            <li>· Wool hat &amp; socks</li>
          </ul>
        </div>

        <Link
          to="/auth"
          className="block w-full text-center rounded-2xl bg-primary text-primary-foreground py-4 font-medium shadow-md shadow-primary/20"
        >
          Get started — it's free
        </Link>
        <p className="mt-4 text-center text-xs text-ink/40">Weather from Open-Meteo. No ads, no tracking.</p>
      </div>
    </div>
  );
}
