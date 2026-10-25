import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useRef, useState } from 'react';
import { ArrowLeft, Plus, Sparkles, Square, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getOutfitInbox, saveOutfitReport, setOutfitReportStatus, resumeOutfitAnalysis } from '@/lib/outfit-feedback.functions';
import { analysisSchema, type FeedbackAnalysis } from '@/lib/outfit-feedback';

const inboxOptions = queryOptions({ queryKey: ['outfit-feedback'], queryFn: () => getOutfitInbox(), retry: false });

export const Route = createFileRoute('/_authenticated/outfit-feedback')({
  loader: ({ context }) => context.queryClient.ensureQueryData(inboxOptions),
  head: () => ({ meta: [
    { title: 'Outfit feedback — Layerly administrator' },
    { name: 'description', content: 'Private parent outfit feedback and recommendation issue review.' },
    { property: 'og:title', content: 'Outfit feedback — Layerly administrator' },
    { property: 'og:description', content: 'Private parent outfit feedback and recommendation issue review.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: OutfitFeedbackPage,
});

function OutfitFeedbackPage() {
  const { data } = useSuspenseQuery(inboxOptions);
  const queryClient = useQueryClient();
  const saveReport = useServerFn(saveOutfitReport);
  const changeStatus = useServerFn(setOutfitReportStatus);
  const resume = useServerFn(resumeOutfitAnalysis);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [feedback, setFeedback] = useState('');
  const [context, setContext] = useState('');
  const [situation, setSituation] = useState<'walk' | 'home' | 'car'>('walk');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const abort = useRef<AbortController | null>(null);
  const latest = data.analyses[0];
  const parsed = analysisSchema.safeParse(latest?.result);
  const [freshResult, setFreshResult] = useState<FeedbackAnalysis | null>(null);
  const analysis = freshResult ?? (parsed.success ? parsed.data : null);
  const openCount = data.reports.filter(report => report.status === 'open').length;
  const stale = latest && data.reports.some(report => report.status === 'open' && !latest.report_ids.includes(report.id));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['outfit-feedback'] });

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await saveReport({ data: { title, feedback, context, situation } });
      setTitle(''); setFeedback(''); setContext(''); setShowForm(false); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Feedback could not be saved.'); }
    finally { setSaving(false); }
  }

  async function analyze() {
    setBusy(true); setError(''); setProgress('Starting review…');
    const controller = new AbortController(); abort.current = controller;
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Sign in to continue.');
      const response = await fetch('/api/outfit-analysis', {
        method: 'POST', headers: { Authorization: `Bearer ${session.session.access_token}` }, signal: controller.signal,
      });
      if (!response.ok) {
        const failure = await response.json();
        throw new Error(failure.message ?? 'Analysis could not start.');
      }
      if (!response.body) throw new Error('No analysis was received.');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = ''; let completed = false;
      while (true) {
        const chunk = await reader.read();
        pending += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = pending.split('\n'); pending = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === 'progress') setProgress(event.message);
          if (event.type === 'error') throw new Error(event.message);
          if (event.type === 'done') { completed = true; setFreshResult(analysisSchema.parse(event.result)); }
        }
        if (chunk.done) break;
      }
      if (!completed) throw new Error('The review was interrupted. No new analysis was saved.');
    } catch (e) {
      setError(controller.signal.aborted ? 'Analysis stopped. Feedback is unchanged.' : e instanceof Error ? e.message : 'Analysis failed.');
    } finally { setBusy(false); setProgress(''); abort.current = null; await refresh(); }
  }

  return <main className="min-h-screen bg-canvas text-ink font-sans">
    <div className="mx-auto max-w-4xl px-5 pb-16 pt-8">
      <Button asChild variant="ghost" className="mb-6 px-0"><Link to="/insights"><ArrowLeft /> Insights</Link></Button>
      <p className="text-xs uppercase text-primary">Administrator</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl">Outfit feedback</h1>
        <Button onClick={() => setShowForm(!showForm)} variant="outline"><Plus /> Add feedback</Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{openCount} open reports · {data.reports.length} recent reports</p>
      {error && <p role="alert" className="mt-5 rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p>}
      {showForm && <form onSubmit={submit} className="mt-8 space-y-4 border-y border-border py-6">
        <h2 className="font-serif text-xl">Parent’s outfit feedback</h2>
        <label className="block text-sm">Issue title<input value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} className="mt-2 block h-11 w-full rounded-md border border-input bg-surface px-3" /></label>
        <label className="block text-sm">Situation<select value={situation} onChange={e => setSituation(e.target.value as typeof situation)} className="mt-2 block h-11 w-full rounded-md border border-input bg-surface px-3"><option value="walk">Walk</option><option value="home">Home</option><option value="car">Car</option></select></label>
        <label className="block text-sm">Feedback<textarea value={feedback} onChange={e => setFeedback(e.target.value)} required maxLength={6000} rows={4} placeholder="What was recommended, and what felt wrong?" className="mt-2 block w-full rounded-md border border-input bg-surface p-3" /></label>
        <label className="block text-sm">Outfit and weather context (optional)<textarea value={context} onChange={e => setContext(e.target.value)} maxLength={4000} rows={3} placeholder="Temperature, transport, walk length, owned clothes and actual outfit" className="mt-2 block w-full rounded-md border border-input bg-surface p-3" /></label>
        <p className="text-xs text-muted-foreground">Leave out parent names, emails and baby identifying details. Feedback and context are sent to Lovable AI when you start a review.</p>
        <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save feedback'}</Button><Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button></div>
      </form>}
      <section className="mt-8 border-y border-border py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Recurring problems</h2>
          {busy ? <Button variant="outline" onClick={() => abort.current?.abort()}><Square /> Stop</Button> : <Button onClick={analyze} disabled={!openCount || !!data.state}><Sparkles /> Analyze open feedback</Button>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">AI suggestions need human review, especially safety-sensitive advice. Outfit rules are never changed automatically. Reviews use workspace AI credits.</p>
        {data.state && <div className="mt-4 text-sm"><p role="alert" className="text-destructive">{data.state.blocked_message}</p><Button variant="outline" className="mt-3" onClick={async () => {
          if (!window.confirm('Only resume after the access or credit issue has been resolved. Has access been restored?')) return;
          try { await resume({ data: { accessRestored: true } }); await refresh(); } catch { setError('Analysis could not be resumed.'); }
        }}><RotateCcw /> Access restored — resume</Button></div>}
        {busy && <p role="status" className="mt-5 text-sm text-primary">{progress}</p>}
        {analysis ? <div className="mt-6">
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
          {latest && <p className="mt-2 text-xs text-muted-foreground">Last review: {new Date(latest.created_at).toLocaleString()} · {latest.report_ids.length} reports{stale ? ' · New feedback awaiting review' : ''}</p>}
          <div className="mt-5 grid gap-4 md:grid-cols-2">{analysis.groups.map((group, index) => <article key={index} className="min-w-0 rounded-lg border border-border bg-surface p-5">
            <p className="text-xs uppercase text-primary">{group.priority} priority · {group.reportIds.length > 1 ? `${group.reportIds.length} related reports` : 'Single report'}</p>
            <h3 className="mt-2 text-lg font-semibold">{group.title}</h3>
            <p className="mt-3 text-sm">{group.problem}</p>
            <dl className="mt-4 space-y-3 text-sm">{[['Evidence', group.evidence], ['Suggested fix', group.suggestedFix], ['Regression check', group.regressionCheck], ['Needs confirmation', group.uncertainty]].map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="mt-1 text-muted-foreground">{value}</dd></div>)}</dl>
            <div className="mt-4 border-t border-border pt-3"><p className="text-xs font-medium">Source feedback</p>{group.reportIds.map(id => <a key={id} href={`#report-${id}`} className="mt-1 block text-xs text-primary underline">{data.reports.find(row => row.id === id)?.title ?? `Report ${id.slice(0, 8)}`}</a>)}</div>
          </article>)}</div>
        </div> : !busy && <p className="mt-5 text-sm text-muted-foreground">No review yet.</p>}
      </section>
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-2xl">Reports</h2><div className="flex gap-1">{(['open', 'resolved', 'all'] as const).map(value => <Button key={value} variant={filter === value ? 'secondary' : 'ghost'} aria-pressed={filter === value} onClick={() => setFilter(value)} className="capitalize">{value}</Button>)}</div></div>
        <div className="mt-5 divide-y divide-border">{data.reports.filter(row => filter === 'all' || row.status === filter).map(row => <article id={`report-${row.id}`} key={row.id} className="py-5 scroll-mt-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs capitalize text-muted-foreground">{row.situation} · {new Date(row.created_at).toLocaleDateString()} · {row.status}</p><h3 className="mt-1 font-semibold">{row.title}</h3></div><Button variant="ghost" size="icon" title={row.status === 'open' ? 'Mark resolved' : 'Reopen report'} aria-label={row.status === 'open' ? 'Mark resolved' : 'Reopen report'} onClick={async () => {
            try { await changeStatus({ data: { id: row.id, status: row.status === 'open' ? 'resolved' : 'open' } }); await refresh(); } catch { setError('Status could not be changed.'); }
          }}>{row.status === 'open' ? <Check /> : <RotateCcw />}</Button></div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm">{row.feedback}</p>
          {row.context && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{row.context}</p>}
        </article>)}</div>
        {!data.reports.some(row => filter === 'all' || row.status === filter) && <p className="mt-5 text-sm text-muted-foreground">No {filter === 'all' ? '' : filter} feedback yet.</p>}
      </section>
    </div>
  </main>;
}