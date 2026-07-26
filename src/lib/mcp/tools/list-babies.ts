import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_babies",
  title: "List baby profiles",
  description: "List the signed-in parent's baby profiles with age, location and temperature preference.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("babies")
      .select("id, name, dob, temperature_pref, location_label, latitude, longitude")
      .order("created_at", { ascending: true });
    if (error) return errorResult(error.message);

    const babies = (data ?? []).map((b) => ({
      ...b,
      age_months: Math.max(
        0,
        Math.floor((Date.now() - new Date(b.dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
      ),
    }));
    return textResult(babies, { babies });
  },
});
