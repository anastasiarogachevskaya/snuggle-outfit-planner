import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredAuthNext, getStoredAuthNext } from "@/lib/auth-redirect";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing in — Layer" },
      { name: "description", content: "Finishing secure sign-in for Layer." },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const goNext = () => {
      const next = getStoredAuthNext();
      clearStoredAuthNext();
      navigate({ to: next, replace: true });
    };

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        goNext();
        return;
      }
      if (error) {
        setMessage(error.message);
        return;
      }
      retryTimer = window.setTimeout(async () => {
        const next = await supabase.auth.getSession();
        if (cancelled) return;
        if (next.data.session) goNext();
        else setMessage("We couldn't finish sign-in. Please try again.");
      }, 900);
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && !cancelled) goNext();
    });

    checkSession();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Layer</p>
        <h1 className="mt-3 text-3xl font-serif font-semibold">Signing you in</h1>
        <p className="mt-3 text-sm text-ink/60">{message}</p>
        {message.includes("couldn't") && (
          <Link to="/auth" className="mt-6 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}