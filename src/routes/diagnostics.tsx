import { createFileRoute, Link } from "@tanstack/react-router";
import { useSyncExternalStore, useState } from "react";
import {
  clearLocationDiagnostics,
  formatLocationDiagnostics,
  getLocationDiagnostics,
  subscribeLocationDiagnostics,
  type LocationDiagSnapshot,
} from "@/lib/location-diagnostics";
import { getCurrentLocation, checkLocationPermission } from "@/lib/location-service";
import {
  getPlatform,
  getPlatformLabel,
  isNativeApp,
  isGeolocationPluginAvailable,
} from "@/lib/platform";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics — Layerly" },
      {
        name: "description",
        content:
          "Internal Layerly diagnostics: shows which location path is used and the last permission and GPS request outcomes.",
      },
      { property: "og:title", content: "Diagnostics — Layerly" },
      {
        property: "og:description",
        content: "Internal Layerly diagnostics for the location and geolocation permission flow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/diagnostics" }],
  }),
  component: DiagnosticsPage,
});

const emptySnapshot = getLocationDiagnostics();

function useDiagnostics(): LocationDiagSnapshot {
  return useSyncExternalStore(
    subscribeLocationDiagnostics,
    getLocationDiagnostics,
    () => emptySnapshot,
  );
}

function DiagnosticsPage() {
  const snap = useDiagnostics();
  const [running, setRunning] = useState(false);
  const [permission, setPermission] = useState<string>("—");
  const [copied, setCopied] = useState(false);

  const runTest = async () => {
    setRunning(true);
    try {
      const res = await getCurrentLocation({ force: true });
      setPermission(await checkLocationPermission());
      // Coordinates intentionally not displayed.
      void res;
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-md px-6 py-8">
        <Link to="/" className="text-sm text-ink/60">
          ← Layerly
        </Link>
        <h1 className="mt-6 font-serif text-3xl font-semibold">Diagnostics</h1>
        <p className="mt-2 text-sm text-ink/60">
          Location path and the last permission / GPS request outcomes. Coordinates are never
          recorded.
        </p>

        <section className="mt-8 space-y-2 rounded-2xl border border-black/5 bg-surface p-4">
          <Row label="Runtime" value={getPlatformLabel()} />
          <Row label="Capacitor platform" value={getPlatform()} />
          <Row label="Native shell" value={String(isNativeApp())} />
          <Row
            label="Geolocation path"
            value={
              snap.nativePathUsed == null
                ? "not used yet"
                : snap.nativePathUsed
                  ? "native Capacitor plugin"
                  : "browser navigator.geolocation"
            }
          />
          <Row
            label="Plugin registered"
            value={
              snap.pluginRegistered == null
                ? String(isGeolocationPluginAvailable())
                : String(snap.pluginRegistered)
            }
          />
          <Row label="Permission (checked)" value={permission} />
        </section>

        <section className="mt-4 space-y-2 rounded-2xl border border-black/5 bg-surface p-4">
          <Row label="Permission before" value={snap.lastPermissionBefore ?? "—"} />
          <Row
            label="requestPermissions"
            value={
              snap.lastRequestPermissionsCalled == null
                ? "—"
                : snap.lastRequestPermissionsCalled
                  ? "called"
                  : "not called"
            }
          />
          <Row label="Permission after" value={snap.lastPermissionAfter ?? "—"} />
          <Row label="getCurrentPosition" value={snap.lastGetCurrentPositionOutcome ?? "—"} />
          <Row label="Outcome" value={snap.lastOutcome ?? "—"} />
          <Row
            label="Duration"
            value={snap.lastDurationMs != null ? `${snap.lastDurationMs} ms` : "—"}
          />
        </section>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={runTest}
            disabled={running}
            className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 disabled:opacity-60"
          >
            {running ? "Requesting…" : "Run location test"}
          </button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(formatLocationDiagnostics(snap));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
            className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium text-ink/70"
          >
            {copied ? "Copied" : "Copy log"}
          </button>
          <button
            onClick={() => clearLocationDiagnostics()}
            className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium text-ink/70"
          >
            Clear
          </button>
        </div>

        <h2 className="mt-8 text-xs font-medium uppercase tracking-widest text-primary/60">
          Event log
        </h2>
        <ol className="mt-3 space-y-1">
          {snap.events.length === 0 && (
            <li className="text-sm text-ink/40">No events yet — run the location test.</li>
          )}
          {snap.events.map((e) => (
            <li
              key={e.id}
              className="rounded-xl border border-black/5 bg-surface px-3 py-2 font-mono text-[11px] leading-relaxed text-ink/70"
            >
              <span className="text-ink/40">
                {new Date(e.at).toISOString().slice(11, 19)} [{e.step}]
              </span>{" "}
              {e.message}
              {e.durationMs != null ? ` (${e.durationMs}ms)` : ""}
            </li>
          ))}
        </ol>

        <SiteFooter className="mt-14" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-ink/50">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
}
