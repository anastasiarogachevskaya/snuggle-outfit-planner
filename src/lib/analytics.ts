import { supabase } from "@/integrations/supabase/client";
import { getPlatform } from "@/lib/platform";

/**
 * Lightweight, privacy-first funnel tracking.
 *
 * Events go into our own `app_events` table — no third-party trackers, no
 * personal data. Guests are stitched together by a random session id kept in
 * sessionStorage; it is meaningless outside this browser tab and never leaves
 * our own database.
 *
 * Every call is fire-and-forget: analytics must never block, slow, or break
 * the UI, so all failures are swallowed.
 */

export type AppEventName =
  // Landing
  | "landing_viewed"
  | "landing_try_clicked"
  | "landing_signin_clicked"
  // Guest flow
  | "try_age_selected"
  | "try_location_set"
  | "try_recommendation_viewed"
  | "try_feedback_submitted"
  | "try_create_account_clicked"
  // Auth — recorded per path, not generically
  | "auth_signin_attempt"
  | "auth_signup_attempt"
  | "auth_cancelled"
  | "auth_failed"
  | "auth_succeeded"
  // Onboarding
  | "wardrobe_chooser_viewed"
  | "wardrobe_mode_chosen"
  | "wardrobe_step_viewed"
  | "wardrobe_saved"
  // Signed-in app
  | "today_viewed"
  | "today_feedback_submitted";

export type AuthMethod = "email" | "google" | "apple";
export type AuthSurface = "web" | "native";

type EventProps = Record<string, string | number | boolean | null>;

const SESSION_KEY = "layerly:session";

/** Matches the database check constraint, so oversized props never 400. */
const MAX_PROPS_BYTES = 1000;

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * A per-tab id so a guest's steps can be joined into a funnel. Deliberately
 * sessionStorage, not localStorage: it disappears when the tab closes and is
 * never used to recognise a returning visitor.
 */
function sessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Drops props wholesale if they exceed what the table accepts. */
function safeProps(props?: EventProps): EventProps {
  if (!props) return {};
  try {
    const serialized = JSON.stringify(props);
    if (serialized.length > MAX_PROPS_BYTES) return {};
    return props;
  } catch {
    return {};
  }
}

function eventPlatform(): "web" | "ios" {
  return getPlatform() === "ios" ? "ios" : "web";
}

/**
 * Records one funnel event. Never throws, never awaits anything the caller
 * depends on, and no-ops during server rendering.
 */
export function logEvent(name: AppEventName, props?: EventProps): void {
  if (typeof window === "undefined") return;

  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      await supabase.from("app_events").insert({
        name,
        user_id: data.session?.user.id ?? null,
        session_id: sessionId(),
        props: safeProps(props),
        platform: eventPlatform(),
      });
    } catch {
      /* analytics must never surface an error to the user */
    }
  })();
}
