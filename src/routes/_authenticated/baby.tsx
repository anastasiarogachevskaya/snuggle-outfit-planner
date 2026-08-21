import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WardrobeIcon, SettingsIcon, HeartIcon } from "@/components/icons";
import {
  getCurrentLocation,
  locationErrorMessage,
  canOpenAppSettings,
  openAppSettings,
  shouldOfferAppSettings,

  type LocationFailureStatus,
} from "@/lib/location-service";
import { CitySearch } from "@/components/city-search";
import { reverseGeocodeLabel, coordinateLabel } from "@/lib/reverse-geocode";
import { SiteFooter } from "@/components/site-footer";
import { lightHaptic, selectionHaptic, successHaptic, warningHaptic } from "@/lib/haptics";
import { useLocationPermissionRecovery } from "@/hooks/use-location-permission-recovery";

export const Route = createFileRoute("/_authenticated/baby")({
  head: () => ({
    meta: [
      { title: "Baby profile — Layerly" },
      {
        name: "description",
        content:
          "Update your baby's name, birth date, temperature preference, and location so Layerly can dress them right.",
      },
      { property: "og:title", content: "Baby profile — Layerly" },
      { property: "og:url", content: "https://layerly.online/baby" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/baby" }],
  }),
  component: BabyPage,
});

function BabyPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const babyQ = useQuery({
    queryKey: ["baby"],
    queryFn: async () => {
      const { data, error } = await supabase.from("babies").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [pref, setPref] = useState(3);
  const [locLabel, setLocLabel] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<LocationFailureStatus | null>(null);

  // If the user enables location in iPhone Settings and comes back, drop the denied state.
  useLocationPermissionRecovery(
    locError === "permission-denied" || locError === "location-disabled",
    useCallback(() => setLocError(null), []),
  );

  useEffect(() => {
    if (babyQ.data) {
      setName(babyQ.data.name);
      setDob(babyQ.data.dob);
      setPref(babyQ.data.temperature_pref);
      setLocLabel(babyQ.data.location_label ?? "");
      setLat(babyQ.data.latitude);
      setLon(babyQ.data.longitude);
    }
  }, [babyQ.data]);

  const useGPS = async () => {
    if (locating) return;
    lightHaptic();
    setLocating(true);
    setLocError(null);
    const result = await getCurrentLocation();
    setLocating(false);

    if (result.status !== "success") {
      warningHaptic();
      setLocError(result.status);
      return;
    }

    const { latitude, longitude } = result;
    setLat(latitude);
    setLon(longitude);
    const label = await reverseGeocodeLabel(latitude, longitude);
    setLocLabel(label ?? coordinateLabel(latitude, longitude));
    successHaptic();
    toast.success("Location saved");
  };




  const save = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user!.id;
      const payload = {
        user_id: uid,
        name: name.trim(),
        dob,
        temperature_pref: pref,
        location_label: locLabel || null,
        latitude: lat,
        longitude: lon,
        updated_at: new Date().toISOString(),
      };
      if (babyQ.data) {
        const { error } = await supabase.from("babies").update(payload).eq("id", babyQ.data.id);
        if (error) throw error;
        return { isNew: false as const };
      } else {
        const { error } = await supabase.from("babies").insert(payload).select().single();
        if (error) throw error;
        return { isNew: true as const };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["baby"] });
      qc.invalidateQueries({ queryKey: ["wardrobe"] });
      successHaptic();
      toast.success("Saved");
      navigate({ to: result?.isNew ? "/onboarding/wardrobe" : "/today" });
    },
    onError: (e: any) => {
      warningHaptic();
      toast.error(e.message ?? "Save failed");
    },
  });

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-md px-6 py-8">
        <Link to="/today" className="text-sm text-ink/60">
          ← Today
        </Link>
        <h1 className="mt-6 text-3xl font-serif font-semibold">Baby profile</h1>

        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Name">
            <input
              className="input"
              required
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leo"
            />
          </Field>

          <Field label="Date of birth">
            <input
              type="date"
              className="input"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </Field>

          <Field label={`Temperature preference: ${prefLabel(pref)}`}>
            <input
              type="range"
              min={1}
              max={5}
              value={pref}
              onChange={(e) => setPref(Number(e.target.value))}
              onPointerUp={() => selectionHaptic()}
              onKeyUp={() => selectionHaptic()}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[11px] text-ink/40 mt-1">
              <span>Runs warm</span>
              <span>Average</span>
              <span>Runs cold</span>
            </div>
          </Field>

          <Field label="Location">
            <CitySearch
              value={locLabel}
              onChange={setLocLabel}
              placeholder="Start typing a city"
              inputClassName="input w-full"
              onSelect={(place) => {
                setLat(place.latitude);
                setLon(place.longitude);
                setLocLabel(place.label);
              }}
            />
            <button
              type="button"
              onClick={useGPS}
              disabled={locating}
              className="mt-2 text-sm text-primary font-medium disabled:opacity-60"
            >
              {locating ? "Finding your location…" : "Use my current location"}
            </button>
            {locError && (
              <div className="mt-2 rounded-2xl border border-black/10 bg-surface p-3">
                <p className="text-xs text-ink/70">{locationErrorMessage(locError)}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-primary">
                  <button
                    type="button"
                    onClick={() => {
                      setLocError(null);
                      document
                        .querySelector<HTMLInputElement>('input[placeholder="Start typing a city"]')
                        ?.focus();
                    }}
                  >
                    Choose location manually
                  </button>
                  {(locError === "timeout" ||
                    locError === "unavailable" ||
                    locError === "error") && (
                    <button type="button" onClick={useGPS}>
                      Retry
                    </button>
                  )}
                  {canOpenAppSettings() && shouldOfferAppSettings(locError) && (
                    <button type="button" onClick={() => void openAppSettings()}>
                      Open Settings
                    </button>
                  )}

                </div>
              </div>
            )}
            {lat !== null && lon !== null && (
              <p className="text-[11px] text-ink/40 mt-1">
                {lat.toFixed(3)}, {lon.toFixed(3)}
              </p>
            )}
          </Field>


          <button
            type="submit"
            disabled={save.isPending}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-medium shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </form>

        {babyQ.data && (
          <div className="mt-8 pt-6 border-t border-black/5 space-y-2">
            <NavCard
              to="/wardrobe"
              title="Wardrobe"
              desc="Update what you own"
              icon={
                <span className="w-10 h-10 rounded-full bg-primary/15 inline-flex items-center justify-center text-primary">
                  <WardrobeIcon size={22} />
                </span>
              }
            />
            <NavCard
              to="/account"
              title="Account & data"
              desc="Sign out, export, delete"
              icon={
                <span className="w-10 h-10 rounded-full bg-primary/15 inline-flex items-center justify-center text-primary">
                  <SettingsIcon size={22} />
                </span>
              }
            />
            <NavCard
              href="https://buymeacoffee.com/nastasija"
              title="Support Layerly"
              desc="Help support independent development"
              icon={
                <span className="w-10 h-10 rounded-full bg-primary/15 inline-flex items-center justify-center text-primary">
                  <HeartIcon size={22} />
                </span>
              }
            />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink/40">
          Not sure? You can change this later.
        </p>

        <SiteFooter className="mt-14" />
      </div>

      <style>{`.input { width:100%; min-width:0; max-width:100%; box-sizing:border-box; border:1px solid rgba(0,0,0,0.1); background: color-mix(in oklab, var(--canvas) 60%, transparent); padding: .75rem 1rem; border-radius: 1rem; font-size: .875rem; outline: none; }
      .input:focus { border-color: color-mix(in oklab, var(--primary) 40%, transparent); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-widest text-primary/60 block mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function NavCard({
  to,
  href,
  title,
  desc,
  icon,
}: {
  to?: "/wardrobe" | "/account";
  href?: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  const className = "flex items-center gap-3 p-4 rounded-2xl bg-surface border border-black/5 hover:border-primary/30 transition-colors";
  const children = (
    <>
      <span className="inline-flex items-center justify-center" aria-hidden>{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-ink/50">{desc}</p>
      </div>
      <span className="text-primary">→</span>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to!} className={className}>
      {children}
    </Link>
  );
}

function prefLabel(n: number) {
  return ["Very warm", "Warm", "Average", "Cool", "Very cool"][n - 1];
}
