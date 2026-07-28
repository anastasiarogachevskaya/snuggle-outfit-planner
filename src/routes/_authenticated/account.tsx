import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account & data — Layerly" },
      {
        name: "description",
        content:
          "Manage your Layerly account: sign out, export your data, reset your wardrobe, or delete your profile.",
      },
      { property: "og:title", content: "Account & data — Layerly" },
      { property: "og:url", content: "https://layerly.online/account" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/account" }],
  }),
  component: AccountPage,
});

function AccountPage() {
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

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClearFeedback, setConfirmClearFeedback] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

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
        <Link to="/baby" className="text-sm text-ink/60">
          ← Baby profile
        </Link>
        <h1 className="mt-6 text-3xl font-serif font-semibold">Account & data</h1>
        <p className="mt-2 text-ink/60 text-sm">Manage your session and stored data.</p>

        <div className="mt-8 space-y-2">
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
            disabled={busy === "export" || !babyQ.data}
          />
          <ActionRow
            title="Reset wardrobe"
            desc="Clear items and re-run setup"
            icon="⟲"
            muted
            onClick={() => setConfirmReset(true)}
            disabled={!babyQ.data}
          />
          <ActionRow
            title="Clear feedback history"
            desc="Delete all past comfort entries"
            icon="⟲"
            muted
            onClick={() => setConfirmClearFeedback(true)}
            disabled={!babyQ.data}
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
            disabled={!babyQ.data}
          />
        </div>
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
              className="w-full border border-black/10 bg-canvas/60 px-4 py-3 rounded-2xl text-sm outline-none focus:border-primary/40"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
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
    </div>
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
