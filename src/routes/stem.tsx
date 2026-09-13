import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { StemStudioPage } from "@/components/stem/StemStudioPage";
import { useRequireAuth } from "@/hooks/use-require-auth";

export const Route = createFileRoute("/stem")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "STEM & SNBT Prep Studio" },
      {
        name: "description",
        content:
          "Analisis materi, generator soal, dan latihan interaktif untuk Matematika, Fisika, Logika, dan persiapan UTBK SNBT.",
      },
      { property: "og:title", content: "STEM & SNBT Prep Studio" },
      {
        property: "og:description",
        content: "Belajar STEM dan SNBT dengan AI: analisis materi, formula cheat-sheet, dan quiz interaktif.",
      },
    ],
  }),
  component: StemRoute,
});

function StemRoute() {
  const { loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="h-dvh grid place-items-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return <StemStudioPage />;
}