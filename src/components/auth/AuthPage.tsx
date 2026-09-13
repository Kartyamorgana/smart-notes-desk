import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BookOpen, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

type Mode = "signin" | "signup";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.55-5.17 3.55-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.22 7.22 0 0 1 0-4.56V6.6H1.27a12 12 0 0 0 0 10.8l4-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.6l4 3.12C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { signInWithPassword, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
        toast.success("Berhasil masuk");
        navigate({ to: "/", replace: true });
      } else {
        await signUp(email.trim(), password, fullName.trim() || undefined);
        toast.success("Akun dibuat", {
          description: "Cek email untuk verifikasi bila diperlukan.",
        });
        navigate({ to: "/", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses autentikasi");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      // Redirect terjadi di window.location — handler tidak lanjut
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal masuk dengan Google");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh grid place-items-center bg-background text-foreground px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground grid place-items-center mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Smart Notes Desk</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin"
              ? "Masuk untuk melanjutkan belajar"
              : "Buat akun baru untuk mulai belajar"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 h-10"
            onClick={onGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            Lanjutkan dengan Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-[11px] text-muted-foreground uppercase tracking-wider">
                atau
              </span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama lengkap (opsional)"
                  autoComplete="name"
                  className="pl-9 h-10"
                  disabled={busy}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                required
                className="pl-9 h-10"
                disabled={busy}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 karakter)"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                className="pl-9 h-10"
                disabled={busy}
              />
            </div>

            <Button type="submit" className="w-full h-10 gap-2" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signin" ? "Masuk" : "Daftar"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary font-medium hover:underline"
                  disabled={busy}
                >
                  Daftar
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-primary font-medium hover:underline"
                  disabled={busy}
                >
                  Masuk
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}