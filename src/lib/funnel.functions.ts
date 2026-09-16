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
  iosMetrics: Metric[];
  iosFunnel: FunnelStep[];
  iosWardrobeModes: BreakdownRow[];
  iosAuthPaths: AuthPathRow[];
  iosEventCounts: BreakdownRow[];
  iosDropoff: BreakdownRow[];
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

/**
 * The iPhone app sets up a baby on the device before any account exists, so its
 * path runs through the guest screens rather than the sign-up ones.
 */
const IOS_STEPS: Array<[string, string]> = [
  ["landing_viewed", "Opened the app"],
  ["landing_try_clicked", "Started setup"],
  ["try_age_selected", "Entered baby details"],
  ["try_location_set", "Set location"],
  ["wardrobe_chooser_viewed", "Reached wardrobe setup"],
  ["wardrobe_saved", "Saved a wardrobe"],
  ["try_recommendation_viewed", "Saw a recommendation"],
  ["try_feedback_submitted", "Rated an outfit"],
  ["try_create_account_clicked", "Tapped “Create account”"],
  ["auth_succeeded", "Created an account"],
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

/**
 * Where each app session stopped: the furthest step of the setup journey it
 * reached. Sessions that reached the last step count as finished.
 */
function lastStepReached(rows: EventRow[], steps: Array<[string, string]>): BreakdownRow[] {
  const order = new Map(steps.map(([key], i) => [key, i]));
  const furthest = new Map<string, number>();
  for (const row of rows) {
    const index = order.get(row.name);
    if (index === undefined) continue;
    const key = row.session_id ?? `anon:${row.created_at}`;
    furthest.set(key, Math.max(furthest.get(key) ?? -1, index));
  }
  const counts = new Array(steps.length).fill(0) as number[];
  for (const index of furthest.values()) counts[index] += 1;
  return steps
    .map(([, label], i) => ({ label, count: counts[i] }))
    .filter((r) => r.count > 0);
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

    const iosEvents = events.filter((event) => event.platform === "ios");
    const iosSessions = new Set(iosEvents.map((e) => e.session_id).filter(Boolean) as string[]).size;
    const iosStarted = countSessions(iosEvents, "landing_try_clicked");
    const iosWardrobeSaved = countSessions(iosEvents, "wardrobe_saved");
    const iosRecommendation = countSessions(iosEvents, "try_recommendation_viewed");
    const iosAccountTaps = countSessions(iosEvents, "try_create_account_clicked");
    const iosAccounts = countSessions(iosEvents, "auth_succeeded");
    // Reaching Today on iPhone means the local-first setup finished: it is the
    // first screen where a recommendation appears.
    const iosReachedToday = new Set(
      iosEvents
        .filter((e) => e.name === "try_recommendation_viewed" || e.name === "today_viewed")
        .map((e) => e.session_id)
        .filter(Boolean) as string[],
    ).size;
    const iosSetupStalled = Math.max(iosStarted - iosReachedToday, 0);

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
      iosMetrics: [
        { label: "App sessions", value: iosSessions, detail: `${iosEvents.length} interactions in the app` },
        {
          label: "Setup completion",
          value: percent(iosWardrobeSaved, iosStarted),
          detail: `${iosWardrobeSaved} of ${iosStarted} sessions that started setup`,
        },
        {
          label: "Reached Today",
          value: percent(iosReachedToday, iosStarted),
          detail: `${iosReachedToday} of ${iosStarted} reached Today · ${iosSetupStalled} stopped during setup`,
        },
        {
          label: "Saw a recommendation",
          value: percent(iosRecommendation, iosSessions),
          detail: `${iosRecommendation} of ${iosSessions} app sessions`,
        },
        {
          label: "Created an account",
          value: iosAccounts,
          detail: `${iosAccountTaps} of ${iosReachedToday} on Today tapped “Create account”`,
        },
      ],
      iosFunnel: IOS_STEPS.map(([key, label]) => ({
        key,
        label,
        sessions: countSessions(iosEvents, key),
      })),
      iosWardrobeModes: tally(
        iosEvents
          .filter((e) => e.name === "wardrobe_mode_chosen")
          .map((e) => prop(e, "mode") ?? "unknown"),
      ),
      iosAuthPaths: buildAuthPaths(iosEvents),
      iosEventCounts: tally(iosEvents.map((e) => e.name)),
      iosDropoff: lastStepReached(iosEvents, IOS_STEPS),
      eventCounts: tally(events.map((e) => e.name)),
    };
  });
