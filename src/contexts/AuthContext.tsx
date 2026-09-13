import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

type AuthActions = {
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    // 1) Ambil sesi awal
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      });
    });

    // 2) Dengarkan perubahan sesi (signin, signout, refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const actions: AuthActions = useMemo(
    () => ({
      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password, fullName) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: fullName ? { data: { full_name: fullName } } : undefined,
        });
        if (error) throw error;
      },
      async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, ...actions }),
    [state, actions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}