import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Proteksi route client-side.
 * - loading: true → jangan render apa pun dulu
 * - !session → redirect ke /auth
 * - session → { user, session } siap dipakai
 */
export function useRequireAuth() {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, session, navigate]);

  return { session, user, loading };
}