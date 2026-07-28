import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — Layerly" },
      {
        name: "description",
        content: "Choose a new password for your Layerly account.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Set new password — Layerly" },
      { property: "og:url", content: "https://layerly.online/reset-password" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/reset-password" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let resolved = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && !resolved)) {
        resolved = true;
        setReady("ok");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        resolved = true;
        setReady("ok");
      } else {
        // Give onAuthStateChange a moment to fire from URL hash
        setTimeout(() => {
          if (!resolved) setReady("invalid");
        }, 1500);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password updated — please sign in");
      navigate({ to: "/auth", replace: true });

    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <div className="mx-auto max-w-md px-6 py-10">
        <Link to="/auth" className="text-sm text-ink/60">
          ← Back to sign in
        </Link>

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/70 mb-2">
            New password
          </p>
          <h1 className="text-3xl font-serif font-semibold">Set a new password.</h1>
        </div>

        <div className="mt-8 bg-surface rounded-3xl p-6 shadow-sm border border-black/5">
          {ready === "checking" && (
            <p className="text-sm text-ink/60 text-center">Verifying your reset link…</p>
          )}

          {ready === "invalid" && (
            <div className="text-center space-y-3">
              <p className="text-sm text-ink/80">
                This reset link is invalid or has expired.
              </p>
              <p className="text-xs text-ink/50">
                Reset links expire after 1 hour.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-md shadow-primary/20"
              >
                Request a new link
              </Link>
            </div>
          )}


          {ready === "ok" && (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                enterKeyHint="next"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-canvas/60 px-4 py-3 text-sm outline-none focus:border-primary/40"
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                enterKeyHint="done"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-canvas/60 px-4 py-3 text-sm outline-none focus:border-primary/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-medium shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
