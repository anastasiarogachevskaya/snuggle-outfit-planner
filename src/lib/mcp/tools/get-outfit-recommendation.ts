import { toddlerRulesApply } from "@/lib/feature-flags";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { recommend, type Situation, type HomeActivity } from "@/lib/recommend";
import { normalizeOutingContext, outingEngineFields } from "@/lib/outing-context";
import { resolveOutingWeather, weatherCoverageMessage } from "@/lib/outing-weather";
import { fetchWeather, isRainingCode, weatherAtMinutesFromNow } from "@/lib/weather";
import {
  fetchWardrobeItems,
  resolveEligibleWardrobe,
  type EligibleWardrobe,
} from "@/lib/wardrobe-eligibility";
import { ageInMonths } from "@/lib/baby-age";
import { normalizeChildPreferences } from "@/lib/child-preferences";
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
    home_activity: z
      .enum(["playing", "sleeping"])
      .optional()
      .describe("Home activity, for situation=home."),
    transport_mode: z
      .enum(["pram", "sitting-stroller", "carrier", "none"])
      .optional()
      .describe("Transport for situation=walk, including none for a stated walking outing."),
    movement: z
      .enum(["seated", "walking", "active", "mixed"])
      .optional()
      .describe("Stated movement for situation=walk; never inferred from transport."),
    activity: z
      .enum(["stroll", "playground", "wet_play", "snow_play"])
      .optional()
      .describe("Optional outdoor activity; does not imply ground or rain."),
    ground: z
      .enum(["dry", "wet", "snow"])
      .optional()
      .describe("Stated ground condition; never inferred from activity or rain."),
    duration_min: z.number().optional().describe("Planned time outside in minutes."),
    leave_in_min: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Optional departure delay in minutes, using the same hourly forecast as Today."),
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
      .select(
        "id, name, dob, temperature_pref, latitude, longitude, location_label, clothing_style, easy_toilet_access",
      )
      .eq("id", input.baby_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!baby) return errorResult("Baby profile not found.");

    // Same read and eligibility rule as the app's Today screen.
    let wardrobe: EligibleWardrobe;
    try {
      wardrobe = resolveEligibleWardrobe(await fetchWardrobeItems(supabase, baby.id));
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : "Couldn't load the wardrobe.");
    }
    const owned = wardrobe.eligible;

    const ageMonths = ageInMonths(baby.dob);

    let weather: Awaited<ReturnType<typeof fetchWeather>> | null = null;
    if (input.feels_like_c === undefined && baby.latitude != null && baby.longitude != null) {
      try {
        weather = await fetchWeather(baby.latitude, baby.longitude);
      } catch {
        weather = null;
      }
    }

    const leaveIn = input.leave_in_min ?? 0;
    const outingWeather =
      weather && input.situation === "walk"
        ? resolveOutingWeather(weather, input.duration_min ?? 30, leaveIn)
        : null;
    const departureWeather =
      weather && input.situation === "walk" && leaveIn > 0
        ? weatherAtMinutesFromNow(weather, leaveIn)
        : weather;
    const feelsLikeC = input.feels_like_c ?? departureWeather?.feelsLikeC;
    // The assistant's toddler default matches Today's 30 minutes. Legacy
    // infant/switch-off calls keep their previous undefined duration.
    const durationMin = toddlerRulesApply(ageMonths)
      ? (input.duration_min ?? 30)
      : input.duration_min;
    if (input.situation !== "home" && feelsLikeC === undefined) {
      return errorResult(
        "No location saved for this baby and no feels_like_c provided — cannot fetch outdoor weather.",
      );
    }

    const rec = recommend({
      feelsLikeC: feelsLikeC ?? 20,
      tempPref: baby.temperature_pref,
      // Same outing normalization as the app's Today screen.
      ...outingEngineFields(
        normalizeOutingContext({
          situation: input.situation as Situation,
          transportMode: input.transport_mode,
          movement: input.movement,
          activity: input.activity,
          ground: input.ground,
        }),
      ),
      roomTempC: input.room_temp_c,
      isRaining: departureWeather ? isRainingCode(departureWeather.code) : undefined,
      durationMin,
      outingWeather: outingWeather ?? undefined,
      owned,
      setAside: wardrobe.setAside,
      // Same saved preferences the app's Today screen passes.
      childPreferences: normalizeChildPreferences(baby),
      garmentDetails: wardrobe.details,
      homeActivity: input.home_activity as HomeActivity | undefined,
      ageMonths,
      uvIndex: departureWeather?.uvIndex,
      cloudCoverPct: departureWeather?.cloudCoverPct,
    });

    const result = {
      baby: { id: baby.id, name: baby.name, age_months: ageMonths },
      outing_weather: outingWeather,
      weather_limitation: outingWeather ? weatherCoverageMessage(outingWeather) : null,
      toddler_rules_applied: toddlerRulesApply(ageMonths),
      weather: departureWeather
        ? {
            temp_c: departureWeather.tempC,
            feels_like_c: departureWeather.feelsLikeC,
            condition: departureWeather.condition,
            wind_kph: departureWeather.windKph,
            uv_index: departureWeather.uvIndex,
            location: baby.location_label,
          }
        : null,
      wardrobe: {
        eligible_items: owned.size,
        availability_filter_applied: wardrobe.availabilityApplied,
        // Owned but marked outgrown / temporarily unavailable — not used.
        set_aside: [...wardrobe.setAside].map(([slug, availability]) => ({ slug, availability })),
      },
      recommendation: rec,
    };
    return textResult(result, result as unknown as Record<string, unknown>);
  },
});
