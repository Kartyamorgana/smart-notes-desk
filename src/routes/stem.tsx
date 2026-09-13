import { createFileRoute } from "@tanstack/react-router";
import { StemStudioPage } from "@/components/stem/StemStudioPage";

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
  component: StemStudioPage,
});