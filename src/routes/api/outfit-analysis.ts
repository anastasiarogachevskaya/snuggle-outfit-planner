import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/outfit-analysis')({
  server: { handlers: { POST: async ({ request }) => {
    const { handleOutfitAnalysis } = await import('@/lib/outfit-feedback.server');
    return handleOutfitAnalysis(request);
  } } },
});