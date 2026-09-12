import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Single-owner dashboard: there is no role system in this app, and building
 * one for exactly one person would be overkill. The report is readable by
 * this account only; everyone else gets a not-found, so the page's existence
 * is not even advertised.
 */
const OWNER_USER_ID = "ac24b320-61a2-4904-9651-5d6ff5e31e1f";

export type FunnelStep = {
  key: string;
  label: string;
  sessions: number;
};

export type BreakdownRow = {
  label: string;
  count: number;
};

export type Metric = {
  label: string;
  value: number;
  detail: string;
};

export type AuthPathRow = {
  label: string;
  attempts: number;
  successes: number;
  cancelled: number;
  failed: number;
};

export type FunnelReport = {
  days: number;
  totalEvents: number;
  totalSessions: number;
  metrics: Metric[];
  fullJourney: FunnelStep[];
  guestFunnel: FunnelStep[];
  signedInFunnel: FunnelStep[];
  authPaths: AuthPathRow[];
  authAttempts: BreakdownRow[];
  authOutcomes: BreakdownRow[];
  authFailureReasons: BreakdownRow[];
  wardrobeModes: BreakdownRow[];
  platforms: BreakdownRow[];
  eventCounts: BreakdownRow[];
};

type EventRow = {
  name: string;
  user_id: string | null;
  session_id: string | null;
  props: Record<string, unknown> | null;
  platform: string;
  created_at: string;
};

const GUEST_STEPS: Array<[string, string]> = [
  ["landing_viewed", "Landed on homepage"],
  ["landing_try_clicked", "Tapped “Try Layerly”"],
  ["try_age_selected", "Chose baby's age"],
  ["try_location_set", "Set location"],
  ["try_recommendation_viewed", "Saw a recommendation"],
  ["try_feedback_submitted", "Gave comfort feedback"],
  ["try_create_account_clicked", "Tapped “Create account”"],
];

const SIGNED_IN_STEPS: Array<[string, string]> = [
  ["auth_signup_attempt", "Started signing up"],
  ["auth_succeeded", "Signed in successfully"],
  ["wardrobe_chooser_viewed", "Reached wardrobe setup"],
  ["wardrobe_mode_chosen", "Picked a setup path"],
  ["wardrobe_saved", "Saved a wardrobe"],
  ["today_viewed", "Used the daily screen"],
  ["today_feedback_submitted", "Gave comfort feedback"],
];

const FULL_JOURNEY_STEPS: Array<[string, string]> = [
  ["landing_viewed", "Viewed landing page"],
  ["landing_try_clicked", "Started guest try-on"],
  ["try_recommendation_viewed", "Saw guest recommendation"],
  ["try_create_account_clicked", "Chose to create an account"],
  ["auth_signup_attempt", "Started account creation"],
  ["auth_succeeded", "Completed sign-in"],
  ["wardrobe_chooser_viewed", "Opened wardrobe setup"],
  ["wardrobe_saved", "Saved wardrobe"],
  ["today_viewed", "Opened Today"],
  ["today_feedback_submitted", "Rated an outfit"],
];

function countSessions(rows: EventRow[], name: string): number {
  const seen = new Set<string>();
  let anonymous = 0;
  for (const r of rows) {
    if (r.name !== name) continue;
    if (r.session_id) seen.add(r.session_id);
    else anonymous += 1;
  }
  return seen.size + anonymous;
}

function tally(pairs: string[]): BreakdownRow[] {
  const map = new Map<string, number>();
  for (const p of pairs) map.set(p, (map.get(p) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function prop(row: EventRow, key: string): string | null {
  const v = row.props?.[key];
  return typeof v === "string" || typeof v === "number" ? String(v) : null;
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function authPathKey(row: EventRow): string {
  return `${prop(row, "method") ?? "unknown"} · ${prop(row, "surface") ?? "unknown"}`;
}

function buildAuthPaths(events: EventRow[]): AuthPathRow[] {
  const paths = new Map<string, AuthPathRow>();
  for (const event of events) {
    if (!event.name.startsWith("auth_")) continue;
    const label = authPathKey(event);
    const row = paths.get(label) ?? { label, attempts: 0, successes: 0, cancelled: 0, failed: 0 };
    if (event.name === "auth_signin_attempt" || event.name === "auth_signup_attempt") row.attempts += 1;
    if (event.name === "auth_succeeded") row.successes += 1;
    if (event.name === "auth_cancelled") row.cancelled += 1;
    if (event.name === "auth_failed") row.failed += 1;
    paths.set(label, row);
  }
  return [...paths.values()].sort((a, b) => b.attempts - a.attempts || b.successes - a.successes);
}

export const getFunnelReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({
    days: Math.min(Math.max(Math.round(input?.days ?? 30), 1), 180),
  }))
  .handler(async ({ data, context }): Promise<FunnelReport> => {
    // Hide the page entirely from anyone who is not the owner.
    if (context.userId !== OWNER_USER_ID) throw notFound();

    // app_events has no read policy for normal roles on purpose, so the
    // report reads it with the privileged client — after the owner check.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("app_events")
      .select("name, user_id, session_id, props, platform, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) throw error;

    const events = (rows ?? []) as EventRow[];

    const sessions = new Set(events.map((e) => e.session_id).filter(Boolean) as string[]);

    const attempts = events.filter(
      (e) => e.name === "auth_signin_attempt" || e.name === "auth_signup_attempt",
    );
    const landingSessions = countSessions(events, "landing_viewed");
    const landingViews = events.filter((event) => event.name === "landing_viewed").length;
    const signinStartedSessions = new Set(
      attempts.map((event) => event.session_id).filter(Boolean) as string[],
    ).size;
    const signinSuccessSessions = countSessions(events, "auth_succeeded");
    const todaySessions = countSessions(events, "today_viewed");
    const signedInActiveSessions = new Set(
      events.filter((event) => event.user_id).map((event) => event.session_id).filter(Boolean) as string[],
    ).size;

    return {
      days: data.days,
      totalEvents: events.length,
      totalSessions: sessions.size,
      metrics: [
        { label: "Landing views", value: landingViews, detail: `${landingSessions} unique sessions` },
        {
          label: "Sign-in start rate",
          value: percent(signinStartedSessions, landingSessions),
          detail: `${signinStartedSessions} of ${landingSessions} landing sessions`,
        },
        {
          label: "Sign-in completion",
          value: percent(signinSuccessSessions, signinStartedSessions),
          detail: `${signinSuccessSessions} of ${signinStartedSessions} started sessions`,
        },
        {
          label: "Today open rate",
          value: percent(todaySessions, signedInActiveSessions),
          detail: `${todaySessions} of ${signedInActiveSessions} signed-in active sessions`,
        },
      ],
      fullJourney: FULL_JOURNEY_STEPS.map(([key, label]) => ({
        key,
        label,
        sessions: countSessions(events, key),
      })),
      guestFunnel: GUEST_STEPS.map(([key, label]) => ({
        key,
        label,
        sessions: countSessions(events, key),
      })),
      signedInFunnel: SIGNED_IN_STEPS.map(([key, label]) => ({
        key,
        label,
        sessions: countSessions(events, key),
      })),
      authPaths: buildAuthPaths(events),
      authAttempts: tally(
        attempts.map((e) => {
          const method = prop(e, "method") ?? "unknown";
          const surface = prop(e, "surface") ?? "unknown";
          const kind = e.name === "auth_signup_attempt" ? "sign-up" : "sign-in";
          return `${method} · ${surface} · ${kind}`;
        }),
      ),
      authOutcomes: tally(
        events
          .filter((e) => e.name.startsWith("auth_") && !e.name.endsWith("_attempt"))
          .map((e) => e.name.replace("auth_", "")),
      ),
      authFailureReasons: tally(
        events
          .filter((e) => e.name === "auth_failed")
          .map((e) => `${prop(e, "method") ?? "unknown"} · ${prop(e, "reason") ?? "unknown"}`),
      ),
      wardrobeModes: tally(
        events
          .filter((e) => e.name === "wardrobe_mode_chosen")
          .map((e) => prop(e, "mode") ?? "unknown"),
      ),
      platforms: tally(events.map((e) => e.platform)),
      eventCounts: tally(events.map((e) => e.name)),
    };
  });
