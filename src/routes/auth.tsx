import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Layer" },
      { name: "description", content: "Sign in to Layer to get today's outfit for your baby." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/today" },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/today" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/today",
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/today" });
  };

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <div className="mx-auto max-w-md px-6 py-10">
        <Link to="/" className="text-sm text-ink/60">
          ← Back
        </Link>

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/70 mb-2">
            {mode === "signin" ? "Welcome back" : "New here"}
          </p>
          <h1 className="text-3xl font-serif font-semibold">
            {mode === "signin" ? "Sign in to Layer." : "Create your Layer account."}
          </h1>
        </div>

        <div className="mt-8 bg-surface rounded-3xl p-6 shadow-sm border border-black/5">
          <button
            onClick={google}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white py-3 text-sm font-medium hover:bg-canvas transition-colors disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <span className="flex-1 h-px bg-black/10" /> or <span className="flex-1 h-px bg-black/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-canvas/60 px-4 py-3 text-sm outline-none focus:border-primary/40"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-canvas/60 px-4 py-3 text-sm outline-none focus:border-primary/40"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-medium shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/60">
            {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
