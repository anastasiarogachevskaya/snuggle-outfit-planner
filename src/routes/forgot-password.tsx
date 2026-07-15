import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Layerly" },
      {
        name: "description",
        content:
          "Forgot your Layerly password? Enter your email and we'll send you a reset link.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reset password — Layerly" },
      { property: "og:url", content: "https://layerly.online/forgot-password" },
    ],
    links: [{ rel: "canonical", href: "https://layerly.online/forgot-password" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your email for a reset link");
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong";
      setErrorMsg(msg);
      toast.error(msg);
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
            Forgot password
          </p>
          <h1 className="text-3xl font-serif font-semibold">Reset your password.</h1>
          <p className="mt-2 text-sm text-ink/60">
            Enter your email and we'll send you a link to set a new one.
          </p>
        </div>

        <div className="mt-8 bg-surface rounded-3xl p-6 shadow-sm border border-black/5">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-ink/80">
                We sent a reset link to <span className="font-medium">{email}</span>.
              </p>
              <p className="text-xs text-ink/50">
                Check your inbox (and spam folder). The link expires in 1 hour.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-primary font-medium text-sm"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-canvas/60 px-4 py-3 text-sm outline-none focus:border-primary/40"
              />
              {errorMsg && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !email}
                className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-medium shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>

          )}
        </div>
      </div>
    </div>
  );
}
