import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredAuthNext, getStoredAuthNext, takeAuthReturnUrl } from "@/lib/auth-redirect";

export const Route = createFileRoute("/auth-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Signing in — Layerly" },
      { name: "description", content: "Finishing your secure Layerly sign-in and redirecting you back to the app." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { error: linkError } = Route.useSearch();
  const [message, setMessage] = useState("Finishing sign-in…");


  useEffect(() => {
    if (linkError) return;
    let cancelled = false;
    let retryTimer: number | undefined;

    const goNext = () => {
      const returnUrl = takeAuthReturnUrl();
      if (returnUrl) {
        clearStoredAuthNext();
        window.location.replace(returnUrl);
        return;
      }
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
        setMessage("We couldn't finish sign-in. Please try again.");
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
  }, [navigate, linkError]);

  const failed = Boolean(linkError) || message.includes("couldn't");

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Layerly</p>
        <h1 className="mt-3 text-3xl font-serif font-semibold">
          {failed ? "Link no longer valid" : "Signing you in"}
        </h1>
        <p className="mt-3 text-sm text-ink/60">
          {linkError
            ? AUTH_LINK_EXPIRED_MESSAGE
            : message}
        </p>
        {failed && (
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/auth" className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
              Back to sign in
            </Link>
            <Link to="/forgot-password" className="text-sm font-medium text-primary">
              Send another link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
