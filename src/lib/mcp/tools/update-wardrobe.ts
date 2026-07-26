import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { WARDROBE_STEPS, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { errorResult, supabaseForUser, textResult } from "../supabase";

const VALID = new Set(WARDROBE_STEPS.flatMap((s) => s.items.map((i) => i.slug as string)));

export default defineTool({
  name: "update_wardrobe",
  title: "Update wardrobe",
  description: "Add or remove wardrobe items for a baby. Use slugs returned by get_wardrobe.",
  inputSchema: {
    baby_id: z.string().describe("Baby profile id from list_babies."),
    add: z.array(z.string()).optional().describe("Wardrobe slugs to mark as owned."),
    remove: z.array(z.string()).optional().describe("Wardrobe slugs to remove."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ baby_id, add, remove }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const toAdd = (add ?? []).filter((s) => VALID.has(s)) as WardrobeSlug[];
    const toRemove = (remove ?? []).filter((s) => VALID.has(s)) as WardrobeSlug[];
    const unknown = [...(add ?? []), ...(remove ?? [])].filter((s) => !VALID.has(s));
    const supabase = supabaseForUser(ctx);

    if (toAdd.length) {
      const { error } = await supabase
        .from("wardrobe_items")
        .upsert(toAdd.map((slug) => ({ baby_id, slug })), { onConflict: "baby_id,slug" });
      if (error) return errorResult(error.message);
    }
    if (toRemove.length) {
      const { error } = await supabase
        .from("wardrobe_items")
        .delete()
        .eq("baby_id", baby_id)
        .in("slug", toRemove);
      if (error) return errorResult(error.message);
    }

    const result = { added: toAdd, removed: toRemove, ignored: unknown };
    return textResult(result, result);
  },
});
