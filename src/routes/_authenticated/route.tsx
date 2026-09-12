import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (data.user) return { user: data.user };

    // getUser() is a network call, so a parent outdoors on bad signal would
    // otherwise be thrown out to the sign-in screen. Only a genuine "no
    // session" answer should sign someone out; when the server simply could
    // not be reached, fall back to the session already stored on the device.
    if (error) {
      const { data: local } = await supabase.auth.getSession();
      if (local.session?.user) return { user: local.session.user };
    }
    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
