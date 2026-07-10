import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/baby")({
  head: () => ({ meta: [{ title: "Baby profile — Layer" }] }),
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

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClearFeedback, setConfirmClearFeedback] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

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

  const signOut = async () => {
    setBusy("signout");
    try {
      await supabase.auth.signOut();
      qc.clear();
      navigate({ to: "/auth" });
    } catch (e: any) {
      toast.error(e.message ?? "Sign out failed");
    } finally {
      setBusy(null);
    }
  };

  const exportData = async () => {
    if (!babyQ.data) return;
    setBusy("export");
    try {
      const [wardrobe, feedback] = await Promise.all([
        supabase.from("wardrobe_items").select("*").eq("baby_id", babyQ.data.id),
        supabase.from("feedback").select("*").eq("baby_id", babyQ.data.id),
      ]);
      if (wardrobe.error) throw wardrobe.error;
      if (feedback.error) throw feedback.error;
      const payload = {
        exported_at: new Date().toISOString(),
        baby: babyQ.data,
        wardrobe_items: wardrobe.data ?? [],
        feedback: feedback.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (babyQ.data.name || "baby").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `layer-export-${safeName}-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const resetWardrobe = async () => {
    if (!babyQ.data) return;
    setBusy("reset");
    try {
      const { error } = await supabase
        .from("wardrobe_items")
        .delete()
        .eq("baby_id", babyQ.data.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["wardrobe"] });
      setConfirmReset(false);
      toast.success("Wardrobe cleared");
      navigate({ to: "/onboarding/wardrobe" });
    } catch (e: any) {
      toast.error(e.message ?? "Reset failed");
    } finally {
      setBusy(null);
    }
  };

  const clearFeedback = async () => {
    if (!babyQ.data) return;
    setBusy("feedback");
    try {
      const { error } = await supabase.from("feedback").delete().eq("baby_id", babyQ.data.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["feedback"] });
      setConfirmClearFeedback(false);
      toast.success("Feedback history cleared");
    } catch (e: any) {
      toast.error(e.message ?? "Clear failed");
    } finally {
      setBusy(null);
    }
  };

  const deleteProfile = async () => {
    if (!babyQ.data) return;
    setBusy("delete");
    try {
      const id = babyQ.data.id;
      const f = await supabase.from("feedback").delete().eq("baby_id", id);
      if (f.error) throw f.error;
      const w = await supabase.from("wardrobe_items").delete().eq("baby_id", id);
      if (w.error) throw w.error;
      const b = await supabase.from("babies").delete().eq("id", id);
      if (b.error) throw b.error;
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Profile deleted");
      navigate({ to: "/auth" });
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const deleteMatches = babyQ.data && deleteInput.trim() === babyQ.data.name.trim();

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
          <>
            <div className="mt-8 pt-6 border-t border-black/5">
              <Link
                to="/wardrobe"
                className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-black/5"
              >
                <div>
                  <p className="text-sm font-medium">Wardrobe</p>
                  <p className="text-xs text-ink/50">Update what you own</p>
                </div>
                <span className="text-primary">→</span>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-black/5">
              <p className="text-xs font-medium uppercase tracking-widest text-primary/60 mb-3">
                Account & data
              </p>
              <div className="space-y-2">
                <ActionRow
                  title="Sign out"
                  desc="Log out of this device"
                  icon="→"
                  onClick={signOut}
                  disabled={busy === "signout"}
                />
                <ActionRow
                  title="Export data"
                  desc="Download baby, wardrobe & feedback as JSON"
                  icon="↓"
                  onClick={exportData}
                  disabled={busy === "export"}
                />
                <ActionRow
                  title="Reset wardrobe"
                  desc="Clear items and re-run setup"
                  icon="⟲"
                  muted
                  onClick={() => setConfirmReset(true)}
                />
                <ActionRow
                  title="Clear feedback history"
                  desc="Delete all past comfort entries"
                  icon="⟲"
                  muted
                  onClick={() => setConfirmClearFeedback(true)}
                />
                <ActionRow
                  title="Delete profile"
                  desc="Permanently remove baby, wardrobe and feedback"
                  icon="×"
                  destructive
                  onClick={() => {
                    setDeleteInput("");
                    setConfirmDelete(true);
                  }}
                />
              </div>
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-ink/40">
          Not sure? You can change this later.
        </p>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset wardrobe?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears every item you own. We'll take you back to wardrobe setup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetWardrobe} disabled={busy === "reset"}>
              {busy === "reset" ? "Clearing…" : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClearFeedback} onOpenChange={setConfirmClearFeedback}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear feedback history?</AlertDialogTitle>
            <AlertDialogDescription>
              All past "comfortable / too cold / too warm" entries will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearFeedback} disabled={busy === "feedback"}>
              {busy === "feedback" ? "Clearing…" : "Clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete profile permanently</DialogTitle>
            <DialogDescription>
              This will remove {babyQ.data?.name}'s profile, wardrobe, and all feedback. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-widest text-primary/60 block">
              Type «{babyQ.data?.name}» to confirm
            </label>
            <input
              className="input"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={babyQ.data?.name}
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-2xl border border-black/10 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={deleteProfile}
              disabled={!deleteMatches || busy === "delete"}
              className="rounded-2xl bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              {busy === "delete" ? "Deleting…" : "Delete permanently"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`.input { width:100%; border:1px solid rgba(0,0,0,0.1); background: color-mix(in oklab, var(--canvas) 60%, transparent); padding: .75rem 1rem; border-radius: 1rem; font-size: .875rem; outline: none; }
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

function ActionRow({
  title,
  desc,
  icon,
  onClick,
  disabled,
  muted,
  destructive,
}: {
  title: string;
  desc: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  muted?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-colors disabled:opacity-50 " +
        (destructive
          ? "bg-surface border-destructive/30 text-destructive hover:bg-destructive/5"
          : muted
            ? "bg-canvas/60 border-black/5 text-ink/70 hover:border-black/20"
            : "bg-surface border-black/5 hover:border-primary/30")
      }
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className={"text-xs mt-0.5 " + (destructive ? "text-destructive/70" : "text-ink/50")}>
          {desc}
        </p>
      </div>
      <span className={destructive ? "text-destructive" : "text-primary"}>{icon}</span>
    </button>
  );
}

function prefLabel(n: number) {
  return ["Very warm", "Warm", "Average", "Cool", "Very cool"][n - 1];
}
