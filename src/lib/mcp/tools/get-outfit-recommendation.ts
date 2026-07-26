import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { recommend, type Situation, type TransportMode, type HomeActivity } from "@/lib/recommend";
import { fetchWeather } from "@/lib/weather";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_outfit_recommendation",
  title: "Get outfit recommendation",
  description:
    "Recommend what a baby should wear right now, based on live weather (or room temperature at home), the baby's profile and the wardrobe the parent owns.",
  inputSchema: {
    baby_id: z.string().describe("Baby profile id from list_babies."),
    situation: z.enum(["home", "walk", "car"]).describe("Where the baby will be."),
    room_temp_c: z.number().optional().describe("Room temperature in Celsius, for situation=home."),
    home_activity: z.enum(["playing", "sleeping"]).optional().describe("Home activity, for situation=home."),
    transport_mode: z
      .enum(["pram", "sitting-stroller", "carrier"])
      .optional()
      .describe("Transport for situation=walk."),
    duration_min: z.number().optional().describe("Planned time outside in minutes."),
    feels_like_c: z
      .number()
      .optional()
      .describe("Override the outdoor feels-like temperature instead of fetching live weather."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data: baby, error } = await supabase
      .from("babies")
      .select("id, name, dob, temperature_pref, latitude, longitude, location_label")
      .eq("id", input.baby_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!baby) return errorResult("Baby profile not found.");

    const { data: items, error: itemsError } = await supabase
      .from("wardrobe_items")
      .select("slug")
      .eq("baby_id", baby.id);
    if (itemsError) return errorResult(itemsError.message);
    const owned = new Set((items ?? []).map((r) => r.slug as WardrobeSlug));

    const ageMonths = Math.max(
      0,
      Math.floor((Date.now() - new Date(baby.dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
    );

    let weather: Awaited<ReturnType<typeof fetchWeather>> | null = null;
    if (input.feels_like_c === undefined && baby.latitude != null && baby.longitude != null) {
      try {
        weather = await fetchWeather(baby.latitude, baby.longitude);
      } catch {
        weather = null;
      }
    }

    const feelsLikeC = input.feels_like_c ?? weather?.feelsLikeC;
    if (input.situation !== "home" && feelsLikeC === undefined) {
      return errorResult(
        "No location saved for this baby and no feels_like_c provided — cannot fetch outdoor weather.",
      );
    }

    const rec = recommend({
      feelsLikeC: feelsLikeC ?? 20,
      tempPref: baby.temperature_pref,
      situation: input.situation as Situation,
      roomTempC: input.room_temp_c,
      transportMode: input.transport_mode as TransportMode | undefined,
      isRaining: weather ? [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weather.code) : undefined,
      durationMin: input.duration_min,
      owned,
      homeActivity: input.home_activity as HomeActivity | undefined,
      ageMonths,
      uvIndex: weather?.uvIndex,
    });

    const result = {
      baby: { id: baby.id, name: baby.name, age_months: ageMonths },
      weather: weather
        ? {
            temp_c: weather.tempC,
            feels_like_c: weather.feelsLikeC,
            condition: weather.condition,
            wind_kph: weather.windKph,
            uv_index: weather.uvIndex,
            location: baby.location_label,
          }
        : null,
      recommendation: rec,
    };
    return textResult(result, result as unknown as Record<string, unknown>);
  },
});
