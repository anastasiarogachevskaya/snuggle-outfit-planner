import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Deletes the caller's own Supabase auth account outright — not just their
 * baby/wardrobe/feedback/analytics rows. The related user-owned rows cascade
 * on delete, and analytics are also removed explicitly before the auth user
 * is deleted as a defense-in-depth safeguard.
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
      .delete()
      .eq("user_id", context.userId);
    if (analyticsError) throw new Error(analyticsError.message);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
  });
