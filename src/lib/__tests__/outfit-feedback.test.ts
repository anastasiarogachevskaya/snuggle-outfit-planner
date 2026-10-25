import { describe, test, expect } from 'bun:test';
import { reportInput, validateEvidence, type FeedbackAnalysis } from '../outfit-feedback';

describe('administrator outfit feedback', () => {
  test('accepts parent feedback for home, walk and car', () => {
    for (const situation of ['home', 'walk', 'car']) {
      expect(reportInput.parse({ title: 'Unowned fleece', feedback: 'Only a cardigan is owned', context: '6°C', situation }).situation).toBe(situation);
    }
    expect(reportInput.safeParse({ title: '', feedback: 'report', context: '', situation: 'sleep' }).success).toBe(false);
  });
  test('AI fixes must reference real reports in the selected review', () => {
    const result: FeedbackAnalysis = { summary: 'Wardrobe issue', groups: [{ title: 'Unowned item', priority: 'high', reportIds: ['report-1'], problem: 'Unowned fleece', evidence: 'Parent owns cardigan', suggestedFix: 'Use owned midlayer', regressionCheck: 'Cardigan is named', uncertainty: 'Need wardrobe snapshot' }] };
    expect(validateEvidence(result, ['report-1']).groups[0].reportIds).toEqual(['report-1']);
    expect(() => validateEvidence(result, ['report-2'])).toThrow();
    expect(() => validateEvidence({ ...result, groups: [{ ...result.groups[0], reportIds: [] }] }, ['report-1'])).toThrow();
  });
});