import { Link, useMatchRoute } from "@tanstack/react-router";
import { BookOpen, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Switch navigasi utama antara Notes Dashboard ("/") dan STEM & SNBT Studio ("/stem").
 * Ditempatkan di sidebar index.tsx dan header StemStudioPage.
 */
export function StemTopNav({
  className,
  size = "compact",
}: {
  className?: string;
  size?: "compact" | "comfortable";
}) {
  const matchRoute = useMatchRoute();
  const isStem = !!matchRoute({ to: "/stem" });

  const itemBase =
    size === "comfortable"
      ? "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
      : "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors";
  const activeCls = "bg-background text-foreground shadow-sm";
  const inactiveCls = "text-muted-foreground hover:text-foreground";

  return (
    <div
      role="tablist"
      aria-label="Navigasi utama"
      className={cn(
        "inline-flex items-center rounded-lg bg-muted p-0.5",
        size === "comfortable" && "w-full",
        className,
      )}
    >
      <Link
        to="/"
        role="tab"
        aria-selected={!isStem}
        className={cn(itemBase, !isStem ? activeCls : inactiveCls)}
      >
        <BookOpen className="w-3.5 h-3.5" />
        Notes
      </Link>
      <Link
        to="/stem"
        role="tab"
        aria-selected={isStem}
        className={cn(itemBase, isStem ? activeCls : inactiveCls)}
      >
        <FlaskConical className="w-3.5 h-3.5" />
        STEM &amp; SNBT
      </Link>
    </div>
  );
}