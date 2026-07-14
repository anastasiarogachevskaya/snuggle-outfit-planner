import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import wardrobeIcon from "@/assets/wardrobe-icon.png.asset.json";

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

  const useGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        try {
          const r = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&count=1&language=en`,
          );
          const j = await r.json();
          const place = j.results?.[0];
          if (place) setLocLabel(`${place.name}${place.country ? ", " + place.country : ""}`);
          else setLocLabel(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
        } catch {
          setLocLabel(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
        }
        toast.success("Location saved");
      },
      () => toast.error("Couldn't get your location"),
    );
  };

  const searchCity = async () => {
    if (!locLabel.trim()) return;
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locLabel)}&count=1&language=en`,
      );
      const j = await r.json();
      const p = j.results?.[0];
      if (!p) {
        toast.error("City not found");
        return;
      }
      setLat(p.latitude);
      setLon(p.longitude);
      setLocLabel(`${p.name}${p.country ? ", " + p.country : ""}`);
      toast.success("Location updated");
    } catch {
      toast.error("Search failed");
    }
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
      toast.success("Saved");
      navigate({ to: result?.isNew ? "/onboarding/wardrobe" : "/today" });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
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
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[11px] text-ink/40 mt-1">
              <span>Runs warm</span>
              <span>Average</span>
              <span>Runs cold</span>
            </div>
          </Field>

          <Field label="Location">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={locLabel}
                onChange={(e) => setLocLabel(e.target.value)}
                placeholder="City name"
              />
              <button
                type="button"
                onClick={searchCity}
                className="px-3 rounded-2xl border border-black/10 text-sm"
              >
                Search
              </button>
            </div>
            <button
              type="button"
              onClick={useGPS}
              className="mt-2 text-sm text-primary font-medium"
            >
              Use my current location
            </button>
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
              icon="👕"
            />
            <NavCard
              to="/account"
              title="Account & data"
              desc="Sign out, export, delete"
              icon="⚙"
            />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink/40">
          Not sure? You can change this later.
        </p>
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
  title,
  desc,
  icon,
}: {
  to: "/wardrobe" | "/account";
  title: string;
  desc: string;
  icon: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-black/5 hover:border-primary/30 transition-colors"
    >
      <span className="text-2xl" aria-hidden>{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-ink/50">{desc}</p>
      </div>
      <span className="text-primary">→</span>
    </Link>
  );
}

function prefLabel(n: number) {
  return ["Very warm", "Warm", "Average", "Cool", "Very cool"][n - 1];
}
