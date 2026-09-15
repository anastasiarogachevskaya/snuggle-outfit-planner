import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  GUEST_AGE_OPTIONS,
  GUEST_DEFAULT_WARDROBE,
  createGuestProfile,
  createLocalProfile,
  useGuestProfile,
  writeGuestProfile,
  type GuestAgeBand,
  type GuestProfile,
} from "@/lib/guest-profile";
import { WardrobeSetup } from "@/components/wardrobe-setup";
import {
  getCurrentLocation,
  locationErrorMessage,
  canOpenAppSettings,
  openAppSettings,
  shouldOfferAppSettings,
  type LocationFailureStatus,
} from "@/lib/location-service";

import { TodayScreen } from "@/components/today-screen";
import { SavePromptSheet, type SavePromptKind } from "@/components/save-prompt-sheet";
import { CitySearch } from "@/components/city-search";
import { reverseGeocodeLabel } from "@/lib/reverse-geocode";
import { WARDROBE_CATALOG, type WardrobeSlug } from "@/lib/wardrobe-catalog";
import { ClothingIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { lightHaptic, successHaptic, warningHaptic } from "@/lib/haptics";
import { useLocationPermissionRecovery } from "@/hooks/use-location-permission-recovery";
import { logEvent } from "@/lib/analytics";
import { isIOSApp } from "@/lib/platform";

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

type Step =
  | "age"
  | "baby"
  | "location"
  | "wardrobe-setup"
  | "today"
  | "profile"
  | "wardrobe"
  | "account";

function TryPage() {
  const navigate = useNavigate();
  const { profile, loaded, setProfile, update } = useGuestProfile();
  const [step, setStep] = useState<Step>("age");
  const [localFirst, setLocalFirst] = useState(false);
  const [prompt, setPrompt] = useState<SavePromptKind>(null);
  const [confirmation, setConfirmation] = useState<null | "cold" | "comfortable" | "warm">(null);

  // Platform and stored profile are both only knowable in the browser, so the
  // opening step is decided once, after hydration, from the two together.
  useEffect(() => {
    if (!loaded) return;
    const ios = isIOSApp();
    setLocalFirst(ios);
    if (!profile) {
      setStep(ios ? "baby" : "age");
      return;
    }
    if (profile.latitude == null && !(ios && profile.setupComplete)) setStep("location");
    else if (ios && !profile.setupComplete) setStep("wardrobe-setup");
    else setStep("today");
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === "today") logEvent("try_recommendation_viewed");
  }, [step]);

  if (!loaded) return <div className="min-h-screen bg-canvas" />;

  if (step === "baby") {
    return (
      <BabyStep
        onDone={(name, dob) => {
          logEvent("try_age_selected", { input: "date_of_birth" });
          const p = createLocalProfile(name, dob);
          writeGuestProfile(p);
          setProfile(p);
          setStep("location");
        }}
      />
    );
  }

  if (step === "wardrobe-setup" && profile) {
    const finish = (wardrobe?: WardrobeSlug[]) => {
      update({ setupComplete: true, ...(wardrobe ? { wardrobe } : {}) });
      if (wardrobe) {
        logEvent("wardrobe_saved", { items: wardrobe.length });
        successHaptic();
        toast.success("Saved on this device");
      }
      setStep("today");
    };
    return (
      <WardrobeSetup
        initialSelected={profile.wardrobe}
        onSave={(slugs) => finish(slugs)}
        onSkip={() => finish()}
      />
    );
  }

  if (step === "age") {
    return (
      <Shell title="How old is your baby?" subtitle="This shapes the layers we suggest.">
        <div className="space-y-3">
          {GUEST_AGE_OPTIONS.map((o) => (
            <button
              key={o.id}
              disabled={o.comingSoon}
              onClick={() => {
                logEvent("try_age_selected", { age_band: o.id });
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
    const setupPending = localFirst && !profile?.setupComplete;
    return (
      <LocationStep
        onSkip={setupPending ? () => setStep("wardrobe-setup") : undefined}
        onDone={(lat, lon, label, method) => {
          logEvent("try_location_set", { method });
          update({ latitude: lat, longitude: lon, locationLabel: label });
          setStep(setupPending ? "wardrobe-setup" : "today");
        }}
      />
    );
  }

  if (!profile) return <div className="min-h-screen bg-canvas" />;

  if (localFirst && step === "profile") {
    return (
      <LocalProfile
        profile={profile}
        onSave={(patch) => {
          update(patch);
          setStep("today");
        }}
        onBack={() => setStep("today")}
        onOpenWardrobe={() => setStep("wardrobe")}
        onOpenAccount={() => setStep("account")}
      />
    );
  }

  if (localFirst && step === "account") {
    return (
      <LocalAccount
        onBack={() => setStep("profile")}
        onCreateAccount={() => {
          logEvent("try_create_account_clicked");
          navigate({ to: "/auth" });
        }}
      />
    );
  }

  if (localFirst && step === "wardrobe") {
    return (
      <LocalWardrobe
        owned={new Set(profile.wardrobe)}
        onChange={(wardrobe) => update({ wardrobe })}
        onBack={() => setStep("today")}
      />
    );
  }


  return (
    <>
      <TodayScreen
        guest={!localFirst}
        baby={{
          id: "guest",
          name: profile.name,
          dob: profile.dob,
          temperature_pref: profile.temperaturePref,
          latitude: profile.latitude,
          longitude: profile.longitude,
          location_label: profile.locationLabel,
        }}
        owned={new Set(localFirst ? profile.wardrobe : GUEST_DEFAULT_WARDROBE)}
        confirmation={confirmation}
        onFeedback={(rating) => {
          logEvent("try_feedback_submitted", { rating });
          setConfirmation(rating);
          if (localFirst) {
            update({
              feedback: [...profile.feedback, { rating, createdAt: new Date().toISOString() }],
            });
          } else {
            setPrompt("feedback");
          }
        }}
        onOpenProfile={() => {
          lightHaptic();
          localFirst ? setStep("profile") : setPrompt("profile");
        }}
        onOpenWardrobe={() => {
          lightHaptic();
          localFirst ? setStep("wardrobe") : setPrompt("wardrobe");
        }}
        secondaryAction={{
          label: "Create account",
          onClick: () => {
            if (localFirst) {
              setStep("account");
              return;
            }
            logEvent("try_create_account_clicked");
            navigate({ to: "/auth" });
          },
        }}
      />
      <SavePromptSheet kind={prompt} onClose={() => setPrompt(null)} />
    </>
  );
}

function BabyStep({ onDone }: { onDone: (name: string, dob: string) => void }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell title="Tell us about your baby" subtitle="This shapes the layers we suggest.">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          successHaptic();
          onDone(name, dob);
        }}
      >
        <label className="block text-sm font-medium">
          Name
          <input
            className="input mt-2"
            required
            autoCapitalize="words"
            autoComplete="given-name"
            enterKeyHint="next"
            placeholder="Leo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium">
          Date of birth
          <input
            type="date"
            className="input mt-2"
            required
            max={today}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>
        <button className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-md shadow-primary/20">
          Continue
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-ink/40">
        No email or password needed. Everything stays on this device.
      </p>
    </Shell>
  );
}

function LocalAccount({
  onBack,
  onCreateAccount,
}: {
  onBack: () => void;
  onCreateAccount: () => void;
}) {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-md px-6 py-8">
        <button onClick={onBack} className="text-sm text-ink/60">
          ← Profile
        </button>
        <h1 className="mt-6 font-serif text-3xl font-semibold">Create an account</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/70">
          Right now your baby's profile, wardrobe and comfort ratings live only on this iPhone, and
          disappear if you delete the app. Creating an account backs them up and lets you open
          Layerly on another device. Everything you've already filled in comes with you.
        </p>
        <button
          onClick={onCreateAccount}
          className="mt-8 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-md shadow-primary/20"
        >
          Create an account
        </button>
      </div>
    </div>
  );
}

function LocationStep({
  onDone,
  onSkip,
}: {
  onDone: (lat: number, lon: number, label: string | null, method: "gps" | "city") => void;
  onSkip?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState("");
  const [failure, setFailure] = useState<LocationFailureStatus | null>(null);
  const gpsFailed = failure !== null;

  useLocationPermissionRecovery(gpsFailed, useCallback(() => setFailure(null), []));

  const useGps = async () => {
    lightHaptic();
    setBusy(true);
    setFailure(null);
    // Explicit tap: always force a fresh GPS read, never a cached position.
    const res = await getCurrentLocation({ force: true });

    if (res.status !== "success") {
      setBusy(false);
      setFailure(res.status);
      warningHaptic();
      toast.error(locationErrorMessage(res.status));
      return;
    }
    const label = await reverseGeocodeLabel(res.latitude, res.longitude);
    setBusy(false);
    successHaptic();
    onDone(res.latitude, res.longitude, label, "gps");
  };

  return (
    <Shell title="Where are you?" subtitle="We use it only to read today's weather.">
      <button
        onClick={useGps}
        disabled={busy}
        className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-md shadow-primary/20 disabled:opacity-60"
      >
        {busy ? "Locating…" : "Use my current location"}
      </button>
      <div className="my-6 text-center text-xs uppercase tracking-widest text-ink/30">or</div>
      {failure && (
        <div className="mb-3 rounded-2xl border border-black/10 bg-surface p-3">
          <p className="text-sm text-ink/70">{locationErrorMessage(failure)}</p>
          {canOpenAppSettings() && shouldOfferAppSettings(failure) && (
            <button
              type="button"
              onClick={() => void openAppSettings()}
              className="mt-2 text-xs font-medium text-primary"
            >
              Open Settings
            </button>
          )}
          <p className="mt-2 text-xs text-ink/50">
            No problem — search for your city instead.
          </p>
        </div>
      )}

      <CitySearch
        value={manual}
        onChange={setManual}
        autoFocus={gpsFailed}
        placeholder="Start typing a city"
        onSelect={(place) => onDone(place.latitude, place.longitude, place.label, "city")}
      />
      {onSkip && (
        <button onClick={onSkip} className="mt-6 w-full text-center text-sm text-ink/50">
          Skip for now
        </button>
      )}
      <p className="mt-6 text-center text-xs text-ink/40">
        Not sure? You can change this later.
      </p>
    </Shell>
  );
}

function LocalProfile({
  profile,
  onSave,
  onBack,
  onOpenWardrobe,
  onOpenAccount,
}: {
  profile: GuestProfile;
  onSave: (patch: Partial<GuestProfile>) => void;
  onBack: () => void;
  onOpenWardrobe: () => void;
  onOpenAccount: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [dob, setDob] = useState(profile.dob);
  const [temperaturePref, setTemperaturePref] = useState(profile.temperaturePref);
  const [locationLabel, setLocationLabel] = useState(profile.locationLabel ?? "");
  const [latitude, setLatitude] = useState(profile.latitude);
  const [longitude, setLongitude] = useState(profile.longitude);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <form
        className="mx-auto max-w-md px-6 py-8"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ name: name.trim(), dob, temperaturePref, locationLabel, latitude, longitude });
          successHaptic();
          toast.success("Saved on this device");
        }}
      >
        <button type="button" onClick={onBack} className="text-sm text-ink/60">← Today</button>
        <h1 className="mt-6 font-serif text-3xl font-semibold">Baby profile</h1>
        <div className="mt-8 space-y-6">
          <label className="block text-sm font-medium">Name
            <input className="input mt-2" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Date of birth
            <input type="date" className="input mt-2" required value={dob} onChange={(e) => setDob(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Temperature preference
            <input type="range" min={1} max={5} className="mt-3 w-full accent-primary" value={temperaturePref} onChange={(e) => setTemperaturePref(Number(e.target.value))} />
            <span className="mt-1 flex justify-between text-xs font-normal text-ink/40"><span>Runs warm</span><span>Average</span><span>Runs cold</span></span>
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Location</p>
            <CitySearch
              value={locationLabel}
              onChange={setLocationLabel}
              inputClassName="input w-full"
              placeholder="Start typing a city"
              onSelect={(place) => {
                setLocationLabel(place.label);
                setLatitude(place.latitude);
                setLongitude(place.longitude);
              }}
            />
          </div>
        </div>
        <button className="mt-8 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-md shadow-primary/20">Save</button>
        <p className="mt-3 text-center text-xs text-ink/40">Saved privately on this device.</p>

        <div className="mt-8 space-y-2">
          <button
            type="button"
            onClick={onOpenWardrobe}
            className="w-full rounded-2xl border border-black/5 bg-surface px-5 py-4 text-left"
          >
            <p className="font-medium">Wardrobe</p>
            <p className="mt-1 text-xs text-ink/50">What's in the drawer right now.</p>
          </button>
          <button
            type="button"
            onClick={onOpenAccount}
            className="w-full rounded-2xl border border-black/5 bg-surface px-5 py-4 text-left"
          >
            <p className="font-medium">Create an account</p>
            <p className="mt-1 text-xs text-ink/50">Back everything up and use other devices.</p>
          </button>
        </div>
      </form>
    </div>
  );
}

function LocalWardrobe({
  owned,
  onChange,
  onBack,
}: {
  owned: Set<WardrobeSlug>;
  onChange: (owned: WardrobeSlug[]) => void;
  onBack: () => void;
}) {
  const groups = Array.from(new Set(WARDROBE_CATALOG.map((item) => item.group)));
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-md px-6 py-8">
        <button onClick={onBack} className="text-sm text-ink/60">← Today</button>
        <h1 className="mt-6 font-serif text-3xl font-semibold">Wardrobe</h1>
        <p className="mt-2 text-sm text-ink/60">Tick everything you own. Changes are saved on this device.</p>
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group}>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary/60">{group}</p>
              <div className="space-y-2">
                {WARDROBE_CATALOG.filter((item) => item.group === group).map((item) => {
                  const selected = owned.has(item.slug);
                  return (
                    <button
                      key={item.slug}
                      aria-pressed={selected}
                      onClick={() => {
                        const next = new Set(owned);
                        selected ? next.delete(item.slug) : next.add(item.slug);
                        onChange([...next]);
                        lightHaptic();
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${selected ? "border-primary/30 bg-surface" : "border-black/5 opacity-60"}`}
                    >
                      <span className={`flex size-6 items-center justify-center rounded-full text-xs ${selected ? "bg-primary text-primary-foreground" : "border border-black/10 bg-white"}`}>{selected ? "✓" : ""}</span>
                      <span className={selected ? "text-primary" : "text-ink/50"}><ClothingIcon slug={item.slug} size={22} /></span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
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
