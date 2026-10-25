import { z } from 'zod';

export const reportInput = z.object({
  title: z.string().trim().min(1).max(120),
  feedback: z.string().trim().min(1).max(6000),
  context: z.string().trim().max(4000),
  situation: z.enum(['home', 'walk', 'car']),
});

export const analysisSchema = z.object({
  summary: z.string(),
  groups: z.array(z.object({
    title: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    reportIds: z.array(z.string()),
    problem: z.string(),
    evidence: z.string(),
    suggestedFix: z.string(),
    regressionCheck: z.string(),
    uncertainty: z.string(),
  }).strict()),
}).strict();

export type FeedbackAnalysis = z.infer<typeof analysisSchema>;

export function validateEvidence(result: FeedbackAnalysis, ids: string[]) {
  const allowed = new Set(ids);
  if (result.groups.some(group => group.reportIds.length === 0 || group.reportIds.some(id => !allowed.has(id)))) {
    throw new Error('The analysis referenced feedback outside this review. No result was saved.');
  }
  return result;
}