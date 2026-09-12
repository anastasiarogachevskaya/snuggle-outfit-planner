import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFunnelReport, type BreakdownRow, type FunnelStep } from "@/lib/funnel.functions";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Layerly" },
      { name: "description", content: "Private Layerly funnel and sign-in insights." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InsightsPage,
});

const RANGES = [7, 30, 90] as const;

function InsightsPage() {
  const [days, setDays] = useState<number>(30);
  const fetchReport = useServerFn(getFunnelReport);

  const q = useQuery({
    queryKey: ["funnel", days],
    queryFn: () => fetchReport({ data: { days } }),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-md px-5 pb-16 pt-[calc(var(--safe-area-top)+1.5rem)]">
        <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Layerly</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">Insights</h1>
        <p className="mt-2 text-sm text-ink/50">
          Where people drop off, and how they try to sign in.
        </p>

        <div className="mt-5 flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={
                "flex-1 rounded-2xl py-2.5 text-sm font-medium " +
                (days === r
                  ? "bg-primary text-primary-foreground"
                  : "border border-black/10 text-ink/60")
              }
            >
              {r} days
            </button>
          ))}
        </div>

        {q.isPending && <p className="mt-8 text-sm text-ink/40">Loading…</p>}

        {q.isError && (
          <div className="mt-8 rounded-2xl border border-black/10 bg-surface p-4">
            <p className="text-sm text-ink/70">This page isn’t available for this account.</p>
            <Link to="/today" className="mt-3 inline-block text-sm font-medium text-primary">
              Back to today
            </Link>
          </div>
        )}

        {q.data && (
          <div className="mt-8 space-y-8">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Events" value={q.data.totalEvents} />
              <Stat label="Sessions" value={q.data.totalSessions} />
            </div>

            <Funnel title="Guest journey" steps={q.data.guestFunnel} />
            <Funnel title="After sign-up" steps={q.data.signedInFunnel} />

            <Breakdown title="Sign-in attempts by method" rows={q.data.authAttempts} />
            <Breakdown title="Sign-in outcomes" rows={q.data.authOutcomes} />
            <Breakdown title="Why sign-ins failed" rows={q.data.authFailureReasons} />
            <Breakdown title="Wardrobe setup choice" rows={q.data.wardrobeModes} />
            <Breakdown title="Web vs app" rows={q.data.platforms} />
            <Breakdown title="All events" rows={q.data.eventCounts} />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-surface p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-ink/40">{label}</p>
    </div>
  );
}

function Funnel({ title, steps }: { title: string; steps: FunnelStep[] }) {
  const top = steps[0]?.sessions ?? 0;
  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-widest text-primary/60">{title}</h2>
      <div className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].sessions : null;
          const width = top > 0 ? Math.max((s.sessions / top) * 100, 2) : 2;
          const drop = prev && prev > 0 ? Math.round(((prev - s.sessions) / prev) * 100) : null;
          return (
            <div key={s.key} className="rounded-2xl border border-black/10 bg-surface p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm">{s.label}</p>
                <p className="text-sm font-semibold tabular-nums">{s.sessions}</p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-black/5">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${width}%` }} />
              </div>
              {drop !== null && drop > 0 && (
                <p className="mt-1.5 text-xs text-ink/40">{drop}% dropped off here</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Breakdown({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-widest text-primary/60">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink/40">Nothing yet.</p>
      ) : (
        <div className="mt-3 divide-y divide-black/5 rounded-2xl border border-black/10 bg-surface">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-ink/70">{r.label}</p>
              <p className="text-sm font-semibold tabular-nums">{r.count}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
