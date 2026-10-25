import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { notFound } from '@tanstack/react-router';
import { z } from 'zod';
import { reportInput } from './outfit-feedback';

export const getOutfitInbox = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed } = await context.supabase.rpc('is_feedback_admin');
    if (!allowed) throw notFound();
    const [reports, analyses, state] = await Promise.all([
      context.supabase.from('outfit_reports').select('*').order('created_at', { ascending: false }).limit(100),
      context.supabase.from('outfit_analyses').select('*').order('created_at', { ascending: false }).limit(5),
      context.supabase.from('outfit_ai_state').select('*').maybeSingle(),
    ]);
    if (reports.error || analyses.error || state.error) throw new Error('Feedback could not be loaded.');
    return { reports: reports.data ?? [], analyses: analyses.data ?? [], state: state.data };
  });

export const saveOutfitReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(reportInput)
  .handler(async ({ context, data }) => {
    const { data: allowed } = await context.supabase.rpc('is_feedback_admin');
    if (!allowed) throw notFound();
    const { data: row, error } = await context.supabase.from('outfit_reports')
      .insert({ ...data, created_by: context.userId }).select('id').single();
    if (error) throw new Error('Feedback could not be saved.');
    return row;
  });

export const setOutfitReportStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), status: z.enum(['open', 'resolved']) }))
  .handler(async ({ context, data }) => {
    const { data: allowed } = await context.supabase.rpc('is_feedback_admin');
    if (!allowed) throw notFound();
    const { error } = await context.supabase.from('outfit_reports').update({ status: data.status }).eq('id', data.id);
    if (error) throw new Error('Feedback status could not be updated.');
    return { ok: true };
  });

export const resumeOutfitAnalysis = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ accessRestored: z.literal(true) }))
  .handler(async ({ context }) => {
    const { data: allowed } = await context.supabase.rpc('is_feedback_admin');
    if (!allowed) throw notFound();
    const { error } = await context.supabase.from('outfit_ai_state').delete().eq('id', true);
    if (error) throw new Error('Analysis could not be resumed.');
    return { ok: true };
  });