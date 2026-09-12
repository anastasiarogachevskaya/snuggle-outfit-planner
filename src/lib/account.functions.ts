import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Deletes the caller's own Supabase auth account outright — not just their
 * baby/wardrobe/feedback rows. Before deletion, account-linked analytics are
 * anonymized so aggregate funnel history remains without identifying the user.
 *
 * Required by App Store guideline 5.1.1(v): an app that supports account
 * creation must also support real account deletion, not just clearing the
 * data associated with it — the account and its credentials have to
 * actually stop existing.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: analyticsError } = await supabaseAdmin
      .from("app_events")
      .update({ user_id: null })
      .eq("user_id", context.userId);
    if (analyticsError) throw new Error(analyticsError.message);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
  });
