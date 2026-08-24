/**
 * In-memory, structured diagnostics for the location flow.
 *
 * Everything recorded here is also mirrored to the console (Xcode / Safari Web
 * Inspector on device). Coordinates are NEVER recorded or logged.
 */

export type LocationDiagStep =
  | "entry"
  | "override"
  | "import"
  | "plugin"
  | "checkPermissions"
  | "requestPermissions"
  | "getCurrentPosition"
  | "outcome"
  | "note";

export type LocationDiagEvent = {
  id: number;
  at: number;
  step: LocationDiagStep;
  message: string;
  /** Milliseconds this step took, when measurable. */
  durationMs?: number;
  ok?: boolean;
};

export type LocationDiagSnapshot = {
  events: LocationDiagEvent[];
  nativePathUsed: boolean | null;
  pluginRegistered: boolean | null;
  lastPermissionBefore: string | null;
  lastPermissionAfter: string | null;
  lastRequestPermissionsCalled: boolean | null;
  lastGetCurrentPositionOutcome: string | null;
  lastOutcome: string | null;
  lastRunAt: number | null;
  lastDurationMs: number | null;
};

const MAX_EVENTS = 60;

let nextId = 1;
let snapshot: LocationDiagSnapshot = emptySnapshot();
const listeners = new Set<() => void>();

function emptySnapshot(): LocationDiagSnapshot {
  return {
    events: [],
    nativePathUsed: null,
    pluginRegistered: null,
    lastPermissionBefore: null,
    lastPermissionAfter: null,
    lastRequestPermissionsCalled: null,
    lastGetCurrentPositionOutcome: null,
    lastOutcome: null,
    lastRunAt: null,
    lastDurationMs: null,
  };
}

function emit() {
  for (const l of listeners) l();
}

export function subscribeLocationDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocationDiagnostics(): LocationDiagSnapshot {
  return snapshot;
}

export function clearLocationDiagnostics() {
  snapshot = emptySnapshot();
  emit();
}

export function recordLocationEvent(
  step: LocationDiagStep,
  message: string,
  extra?: { durationMs?: number; ok?: boolean; patch?: Partial<LocationDiagSnapshot> },
) {
  const event: LocationDiagEvent = {
    id: nextId++,
    at: Date.now(),
    step,
    message,
    durationMs: extra?.durationMs,
    ok: extra?.ok,
  };
  const events = [...snapshot.events, event].slice(-MAX_EVENTS);
  snapshot = { ...snapshot, ...(extra?.patch ?? {}), events };
  emit();
}

/** Times an async step, records it, and rethrows failures unchanged. */
export async function timeStep<T>(
  step: LocationDiagStep,
  label: string,
  fn: () => Promise<T>,
  describe?: (value: T) => string,
): Promise<T> {
  const started = Date.now();
  try {
    const value = await fn();
    const detail = describe ? describe(value) : "ok";
    recordLocationEvent(step, `${label} → ${detail}`, {
      durationMs: Date.now() - started,
      ok: true,
    });
    return value;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordLocationEvent(step, `${label} → threw: ${message}`, {
      durationMs: Date.now() - started,
      ok: false,
    });
    throw err;
  }
}

/** Plain-text dump, for the "Copy diagnostics" button. */
export function formatLocationDiagnostics(s: LocationDiagSnapshot = snapshot): string {
  const head = [
    `native path used: ${s.nativePathUsed ?? "—"}`,
    `plugin registered: ${s.pluginRegistered ?? "—"}`,
    `permission before: ${s.lastPermissionBefore ?? "—"}`,
    `requestPermissions called: ${s.lastRequestPermissionsCalled ?? "—"}`,
    `permission after: ${s.lastPermissionAfter ?? "—"}`,
    `getCurrentPosition: ${s.lastGetCurrentPositionOutcome ?? "—"}`,
    `outcome: ${s.lastOutcome ?? "—"}`,
    `duration: ${s.lastDurationMs != null ? `${s.lastDurationMs}ms` : "—"}`,
  ].join("\n");
  const body = s.events
    .map(
      (e) =>
        `${new Date(e.at).toISOString().slice(11, 23)} [${e.step}] ${e.message}` +
        (e.durationMs != null ? ` (${e.durationMs}ms)` : ""),
    )
    .join("\n");
  return `${head}\n\n${body}`;
}
