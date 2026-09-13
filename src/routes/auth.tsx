import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    // Kalau sudah login, langsung alihkan ke beranda
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Masuk — Smart Notes Desk" },
      { name: "description", content: "Masuk atau daftar untuk mulai belajar." },
    ],
  }),
  component: AuthPage,
});