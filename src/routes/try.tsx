import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  GUEST_AGE_OPTIONS,
  GUEST_DEFAULT_WARDROBE,
  createGuestProfile,
  useGuestProfile,
  writeGuestProfile,
  type GuestAgeBand,
} from "@/lib/guest-profile";
import { getCurrentLocation, locationErrorMessage } from "@/lib/location-service";
import { TodayScreen } from "@/components/today-screen";
import { SavePromptSheet, type SavePromptKind } from "@/components/save-prompt-sheet";
import { CitySearch } from "@/components/city-search";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";
import { SiteFooter } from "@/components/site-footer";
import { useLocationPermissionRecovery } from "@/hooks/use-location-permission-recovery";

export const Route = createFileRoute("/try")({
  head: () => ({
    meta: [
      { title: "Try Layerly — no account needed" },
      {
        name: "description",
        content:
          "Pick your baby's age, share your location, and get a full outfit recommendation for today. No registration required.",
      },
      { property: "og:title", content: "Try Layerly — no account needed" },
      {
        property: "og:description",
        content:
          "Pick your baby's age, share your location, and get a full outfit recommendation for today. No registration required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://layerly.online/try" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/try" }],
  }),
  component: TryPage,
});

const GUEST_OWNED = new Set<WardrobeSlug>(GUEST_DEFAULT_WARDROBE);

function TryPage() {
  const navigate = useNavigate();
  const { profile, loaded, setProfile, update } = useGuestProfile();
  const [step, setStep] = useState<"age" | "location" | "today">("age");
  const [prompt, setPrompt] = useState<SavePromptKind>(null);
  const [confirmation, setConfirmation] = useState<null | "cold" | "comfortable" | "warm">(null);

  useEffect(() => {
    if (!loaded) return;
    if (profile?.latitude != null) setStep("today");
    else if (profile) setStep("location");
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return <div className="min-h-screen bg-canvas" />;

  if (step === "age") {
    return (
      <Shell title="How old is your baby?" subtitle="This shapes the layers we suggest.">
        <div className="space-y-3">
          {GUEST_AGE_OPTIONS.map((o) => (
            <button
              key={o.id}
              disabled={o.comingSoon}
              onClick={() => {
                const p = createGuestProfile(o.id as GuestAgeBand);
                writeGuestProfile(p);
                setProfile(p);
                setStep("location");
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-black/5 bg-surface px-5 py-4 text-left text-ink disabled:opacity-40"
            >
              <span className="font-medium">{o.label}</span>
              <span className="text-xs text-ink/40">{o.comingSoon ? "Coming soon" : "→"}</span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink/40">
          Nothing is saved to an account. You can create one later.
        </p>
      </Shell>
    );
  }

  if (step === "location") {
    return (
      <LocationStep
        onDone={(lat, lon, label) => {
          update({ latitude: lat, longitude: lon, locationLabel: label });
          setStep("today");
        }}
      />
    );
  }

  if (!profile) return <div className="min-h-screen bg-canvas" />;

  return (
    <>
      <TodayScreen
        guest
        baby={{
          id: "guest",
          name: profile.name,
          dob: profile.dob,
          temperature_pref: profile.temperaturePref,
          latitude: profile.latitude,
          longitude: profile.longitude,
          location_label: profile.locationLabel,
        }}
        owned={GUEST_OWNED}
        confirmation={confirmation}
        onFeedback={(rating) => {
          setConfirmation(rating);
          setPrompt("feedback");
        }}
        onOpenProfile={() => setPrompt("profile")}
        onOpenWardrobe={() => setPrompt("wardrobe")}
        secondaryAction={{ label: "Create account", onClick: () => navigate({ to: "/auth" }) }}
      />
      <SavePromptSheet kind={prompt} onClose={() => setPrompt(null)} />
    </>
  );
}

function LocationStep({
  onDone,
}: {
  onDone: (lat: number, lon: number, label: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [gpsFailed, setGpsFailed] = useState(false);

  useLocationPermissionRecovery(gpsFailed, useCallback(() => setGpsFailed(false), []));

  const useGps = async () => {
    setBusy(true);
    const res = await getCurrentLocation();
    if (res.status !== "success") {
      setBusy(false);
      setGpsFailed(true);
      toast.error(locationErrorMessage(res.status));
      return;
    }
    let label: string | null = null;
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${res.latitude}&longitude=${res.longitude}&count=1&language=en`,
      );
      const j = await r.json();
      label = j?.results?.[0]?.name ?? null;
    } catch {
      label = null;
    }
    setBusy(false);
    onDone(res.latitude, res.longitude, label);
  };

  return (
    <Shell title="Where are you?" subtitle="We use it only to read today's weather.">
      <button
        onClick={useGps}
        disabled={busy}
        className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-md shadow-primary/20 disabled:opacity-60"
      >
        {busy ? "Locating…" : "Use my location"}
      </button>
      <div className="my-6 text-center text-xs uppercase tracking-widest text-ink/30">or</div>
      {gpsFailed && (
        <p className="mb-3 text-sm text-ink/60">
          No problem — search for your city instead.
        </p>
      )}
      <CitySearch
        value={manual}
        onChange={setManual}
        autoFocus={gpsFailed}
        placeholder="Start typing a city"
        onSelect={(place) => onDone(place.latitude, place.longitude, place.label)}
      />
      <p className="mt-6 text-center text-xs text-ink/40">
        Not sure? You can change this later.
      </p>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-canvas font-sans text-ink">
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <header className="mb-10 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold">
            Layerly
          </Link>
          <Link to="/auth" className="text-sm font-medium text-primary">
            Sign in
          </Link>
        </header>
        <h1 className="mb-2 font-serif text-3xl font-semibold">{title}</h1>
        <p className="mb-8 leading-relaxed text-ink/60">{subtitle}</p>
        {children}

        <SiteFooter className="mt-14" />
      </div>
    </div>
  );
}
