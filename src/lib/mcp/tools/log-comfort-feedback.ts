import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "log_comfort_feedback",
  title: "Log comfort feedback",
  description: "Record how comfortable the baby was in an outfit, so Layerly can learn from it.",
  inputSchema: {
    baby_id: z.string().describe("Baby profile id from list_babies."),
    rating: z.enum(["too_cold", "just_right", "too_warm"]).describe("How the baby felt."),
    situation: z.enum(["home", "walk", "car"]).describe("Where the outfit was worn."),
    room_temp_c: z.number().optional().describe("Room temperature in Celsius, if at home."),
    feels_like_c: z.number().optional().describe("Outdoor feels-like temperature in Celsius."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { error } = await supabaseForUser(ctx).from("feedback").insert({
      baby_id: input.baby_id,
      rating: input.rating,
      situation: input.situation,
      room_temp_c: input.room_temp_c ?? null,
      feels_like_c: input.feels_like_c ?? null,
    });
    if (error) return errorResult(error.message);
    return textResult({ saved: true });
  },
});
