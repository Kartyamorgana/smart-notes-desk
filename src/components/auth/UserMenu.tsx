import { LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

function initialsOf(name: string | undefined, email: string | undefined) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]![0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  if (email) return email[0]!.toUpperCase();
  return "?";
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined);
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined);
  const email = user.email;

  const onSignOut = async () => {
    try {
      await signOut();
      toast.success("Berhasil keluar");
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal keluar");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu pengguna"
        >
          <Avatar className="w-8 h-8 border border-border">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? email ?? "User"} />}
            <AvatarFallback className="text-[11px] font-semibold">
              {initialsOf(fullName, email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-sm font-semibold truncate">
            {fullName ?? "Pengguna"}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-muted-foreground">
          <UserIcon className="w-4 h-4 mr-2" />
          Akun saya
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}