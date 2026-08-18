import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { initPlatform } from "@/lib/platform";
import { initializeNativeUI } from "@/lib/native-ui";
import { initNativeLifecycle, setDeepLinkHandler } from "@/lib/native-lifecycle";
import { PlatformDebugBadge } from "@/components/platform-debug-badge";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-serif italic text-ink">404</h1>
        <h2 className="mt-4 text-xl font-serif font-semibold text-ink">Page not found</h2>
        <p className="mt-2 text-sm text-ink/60">This page doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-serif font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink/60">Try again or head home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-2xl border border-black/10 px-5 py-2.5 text-sm">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#7D8F69" },
      { name: "apple-mobile-web-app-title", content: "Layerly" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "Layerly — What should baby wear today?" },
      {
        name: "description",
        content:
          "Layerly turns today's weather into a simple layered outfit for your baby, using clothes you already own.",
      },
      { property: "og:title", content: "Layerly — What should baby wear today?" },
      {
        property: "og:description",
        content: "Layerly turns today's weather into a simple layered outfit for your baby, using clothes you already own.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Layerly — What should baby wear today?" },
      { name: "twitter:description", content: "Layerly turns today's weather into a simple layered outfit for your baby, using clothes you already own." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8d945aa4-20b5-4f76-8234-267df2c9f2f6/id-preview-558ba17c--61d18b02-2730-4e31-9318-73112e9e585a.lovable.app-1783767349149.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8d945aa4-20b5-4f76-8234-267df2c9f2f6/id-preview-558ba17c--61d18b02-2730-4e31-9318-73112e9e585a.lovable.app-1783767349149.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "mask-icon", href: "/mask-icon.svg", color: "#7D8F69" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Layerly",
          description:
            "Layerly helps parents decide what their baby should wear based on today's weather, your baby's age, and the clothes you already own.",
          url: "https://layerly.online",
          applicationCategory: "HealthApplication",
          operatingSystem: "Web, iOS, Android",
          browserRequirements: "Requires JavaScript",
          logo: "https://layerly.online/icon-512.png",
          image: "https://layerly.online/icon-512.png",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          publisher: { "@type": "Organization", name: "Layerly", url: "https://layerly.online" },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    initPlatform();
    initializeNativeUI();
    setDeepLinkHandler((url) => {
      const authLink = parseAuthDeepLink(url);
      if (authLink) {
        void processAuthDeepLink(url).then((result) => {
          if (result.status === "success") {
            router.navigate({
              to: authLink.kind === "reset" ? "/reset-password" : "/auth-callback",
              replace: true,
            });
          } else if (result.status === "error") {
            router.navigate({ to: "/auth-callback", search: { error: "invalid" }, replace: true });
          }
        });
        return;
      }
      try {
        const parsed = new URL(url);
        router.navigate({ href: `${parsed.pathname}${parsed.search}${parsed.hash}` });
      } catch {
        /* ignore malformed deep links */
      }
    });

    initNativeLifecycle();
    return () => setDeepLinkHandler(null);
  }, [router]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" closeButton richColors />
      <PlatformDebugBadge />
    </QueryClientProvider>
  );
}
