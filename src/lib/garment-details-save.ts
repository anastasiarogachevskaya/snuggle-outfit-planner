import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_GARMENT_DETAILS, changedGarmentDetails, type GarmentDetails } from "@/lib/garment-details";

const DETAIL_KEYS = Object.keys(DEFAULT_GARMENT_DETAILS) as (keyof GarmentDetails)[];

/**
 * Write a garment-details patch to one existing signed-in wardrobe row.
 * Only detail columns that are present in the patch are sent; ownership and
 * every other column are never part of the update. Zero matched rows (wrong
 * child, missing item, or access denied) is treated as a failed save.
 */
export async function saveSignedInGarmentDetails(
  client: SupabaseClient<Database>,
  babyId: string,
  slug: string,
  patch: Partial<GarmentDetails>,
): Promise<void> {
  const update: Partial<GarmentDetails> = {};
  for (const k of DETAIL_KEYS) {
    if (patch[k] !== undefined) (update as Record<string, string>)[k] = patch[k] as string;
  }
  if (Object.keys(update).length === 0) return;
  const { data, error } = await client
    .from("wardrobe_items")
    .update(update)
    .eq("baby_id", babyId)
    .eq("slug", slug)
    .select("slug");
  if (error) throw new Error(error.message || "Save failed");
  if (!data?.length) throw new Error("Item not found");
}

export type GarmentDetailsSubmitResult =
  | { status: "saved" }
  | { status: "unchanged" }
  | { status: "failed"; message: string; draft: GarmentDetails };

/**
 * The details dialog's save step: send only what changed, and on failure hand
 * back the parent's unsaved draft so the form keeps their edits.
 */
export async function submitGarmentDetails(
  before: GarmentDetails,
  draft: GarmentDetails,
  write: (patch: Partial<GarmentDetails>) => Promise<void>,
): Promise<GarmentDetailsSubmitResult> {
  const patch = changedGarmentDetails(before, draft);
  if (Object.keys(patch).length === 0) return { status: "unchanged" };
  try {
    await write(patch);
    return { status: "saved" };
  } catch (e) {
    return {
      status: "failed",
      draft,
      message:
        (e instanceof Error && e.message ? e.message + ". " : "") +
        "Your changes weren't saved yet — please try again.",
    };
  }
}
