import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Deletes the caller's own Supabase auth account outright — not just their
 * baby/wardrobe/feedback rows. babies.user_id, wardrobe_items.baby_id, and
 * feedback.baby_id all cascade on delete (see supabase/migrations), so
 * removing the auth user is enough to remove everything else too.
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
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
  });
