import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { WARDROBE_STEPS, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { errorResult, supabaseForUser, textResult } from "../supabase";

const ALL = WARDROBE_STEPS.flatMap((s) => s.items);

export default defineTool({
  name: "get_wardrobe",
  title: "Get wardrobe",
  description: "List which wardrobe items a baby owns, and which catalog items are still missing.",
  inputSchema: { baby_id: z.string().describe("Baby profile id from list_babies.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ baby_id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("wardrobe_items")
      .select("slug")
      .eq("baby_id", baby_id);
    if (error) return errorResult(error.message);

    const owned = new Set((data ?? []).map((r) => r.slug as WardrobeSlug));
    const result = {
      owned: ALL.filter((i) => owned.has(i.slug)).map((i) => ({ slug: i.slug, label: i.label })),
      missing: ALL.filter((i) => !owned.has(i.slug)).map((i) => ({ slug: i.slug, label: i.label })),
    };
    return textResult(result, result);
  },
});
