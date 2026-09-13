import { useCallback, useState } from "react";
import { FlaskConical, Moon, Notebook, Sparkles, Sun, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/hooks/use-theme";
import { createNote, updateNote } from "@/lib/db";
import { StemTopNav } from "./StemTopNav";
import { StemAnalyzer } from "./StemAnalyzer";
import { StemPractice } from "./StemPractice";
import { StemCheatSheet } from "./StemCheatSheet";
import type { StemAnalysis, SubjectId } from "@/lib/stem.functions";

type StemTab = "analyzer" | "cheatsheet" | "practice";

export function StemStudioPage() {
  const { theme, toggle } = useTheme();
  const [subject, setSubject] = useState<SubjectId>("matematika");
  const [analysis, setAnalysis] = useState<StemAnalysis | null>(null);
  const [tab, setTab] = useState<StemTab>("analyzer");

  // Materi acuan (dipakai Cheat Sheet & Practice)
  const material = analysis
    ? [analysis.overview, analysis.concepts, analysis.formulas, analysis.pitfalls]
        .filter((s) => s && s.trim().length > 0)
        .join("\n\n")
    : undefined;

  const saveAsNote = useCallback(async (title: string, markdown: string) => {
    try {
      const n = await createNote(null);
      await updateNote(n.id, { title, content: markdown });
      toast.success("Catatan tersimpan", { description: title });
    } catch (e) {
      toast.error("Gagal menyimpan catatan", { description: (e as Error).message });
    }
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-3 sm:px-4 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="font-semibold leading-none text-sm truncate">
              STEM &amp; SNBT Prep Studio
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
              Matematika · Fisika · Logika · UTBK SNBT
            </div>
          </div>
        </div>

        <StemTopNav className="ml-auto" />

        <button
          type="button"
          onClick={toggle}
          className="p-1.5 rounded hover:bg-accent"
          title="Ganti tema"
          aria-label="Ganti tema terang/gelap"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-5xl w-full p-3 sm:p-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as StemTab)}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="analyzer" className="gap-1.5 text-xs sm:text-sm">
                <Sparkles className="w-3.5 h-3.5" /> Analisis
              </TabsTrigger>
              <TabsTrigger value="cheatsheet" className="gap-1.5 text-xs sm:text-sm">
                <Notebook className="w-3.5 h-3.5" /> Cheat Sheet
              </TabsTrigger>
              <TabsTrigger value="practice" className="gap-1.5 text-xs sm:text-sm">
                <Trophy className="w-3.5 h-3.5" /> Latihan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analyzer" className="mt-4">
              <StemAnalyzer
                subject={subject}
                onSubjectChange={setSubject}
                onResult={(a) => {
                  setAnalysis(a);
                  setTab("cheatsheet");
                }}
                onSaveNote={saveAsNote}
              />
            </TabsContent>

            <TabsContent value="cheatsheet" className="mt-4">
              <StemCheatSheet
                subject={subject}
                topic={analysis?.title}
                material={material}
                onSaveNote={saveAsNote}
              />
            </TabsContent>

            <TabsContent value="practice" className="mt-4">
              <StemPractice
                subject={subject}
                topic={analysis?.title}
                material={material}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}