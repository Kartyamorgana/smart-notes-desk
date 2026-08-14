import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Gamepad2,
  Loader2,
  RotateCcw,
  Check,
  X,
  Trophy,
  Layers,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateStudyGame } from "@/lib/ingest.functions";

type Quiz = { question: string; options: string[]; answer: number; explanation: string };
type Card = { front: string; back: string };
type Pair = { term: string; definition: string };
type Game = { quiz: Quiz[]; flashcards: Card[]; matching: Pair[] };

export function StudyGamePanel({ content, noteId }: { content: string; noteId: string }) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [picked, setPicked] = useState<{ term?: string; def?: string }>({});
  const [matched, setMatched] = useState<string[]>([]);
  const run = useServerFn(generateStudyGame);

  const reset = () => {
    setAnswers({});
    setFlipped({});
    setPicked({});
    setMatched([]);
  };

  const generate = async () => {
    if (content.trim().length < 20) {
      toast.error("Catatan terlalu pendek untuk dibuat latihan");
      return;
    }
    setLoading(true);
    try {
      const res = await run({ data: { content } });
      setGame(res as Game);
      reset();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("429")) toast.error("Terlalu banyak permintaan, coba lagi sebentar");
      else if (msg.includes("402")) toast.error("Kredit AI habis, tambah kredit di workspace");
      else toast.error("Gagal membuat latihan", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const score = useMemo(() => {
    if (!game) return 0;
    return game.quiz.reduce((acc, q, i) => (answers[i] === q.answer ? acc + 1 : acc), 0);
  }, [game, answers]);

  const shuffledDefs = useMemo(() => {
    if (!game) return [];
    return [...game.matching].sort((a, b) => a.definition.localeCompare(b.definition));
  }, [game]);

  const tryMatch = (term?: string, def?: string) => {
    const next = { term: term ?? picked.term, def: def ?? picked.def };
    setPicked(next);
    if (next.term && next.def) {
      const ok = game?.matching.some((p) => p.term === next.term && p.definition === next.def);
      if (ok) {
        setMatched((m) => [...m, next.term!]);
        toast.success("Cocok!");
      } else {
        toast.error("Belum cocok");
      }
      setTimeout(() => setPicked({}), 250);
    }
  };

  if (!game) {
    return (
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-3">
          <Gamepad2 className="w-7 h-7" />
        </div>
        <h3 className="font-semibold mb-1">Mode Belajar Interaktif</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          Ubah catatan ini menjadi kuis pilihan ganda, flashcard, dan permainan mencocokkan istilah.
        </p>
        <Button onClick={generate} disabled={loading} className="gap-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gamepad2 className="w-4 h-4" />}
          Buat latihan dari catatan
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" key={noteId}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="w-4 h-4 text-primary" />
          Skor kuis: {score}/{game.quiz.length}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={reset} className="gap-1 h-8 text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Ulangi
          </Button>
          <Button size="sm" variant="secondary" onClick={generate} disabled={loading} className="gap-1 h-8 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gamepad2 className="w-3.5 h-3.5" />}
            Buat ulang
          </Button>
        </div>
      </div>

      <Tabs defaultValue="quiz">
        <TabsList className="w-full">
          <TabsTrigger value="quiz" className="flex-1 gap-1">
            <Gamepad2 className="w-3.5 h-3.5" /> Kuis
          </TabsTrigger>
          <TabsTrigger value="cards" className="flex-1 gap-1">
            <Layers className="w-3.5 h-3.5" /> Flashcard
          </TabsTrigger>
          <TabsTrigger value="match" className="flex-1 gap-1">
            <Link2 className="w-3.5 h-3.5" /> Cocokkan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quiz" className="space-y-4 mt-4">
          {game.quiz.map((q, i) => {
            const chosen = answers[i];
            const done = chosen !== undefined;
            return (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="font-medium text-sm mb-2">
                  {i + 1}. {q.question}
                </div>
                <div className="space-y-1.5">
                  {q.options.map((o, oi) => {
                    const isAnswer = oi === q.answer;
                    const state = !done
                      ? "idle"
                      : isAnswer
                        ? "correct"
                        : chosen === oi
                          ? "wrong"
                          : "idle";
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={done}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                        className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors flex items-center gap-2 ${
                          state === "correct"
                            ? "border-primary bg-primary/10"
                            : state === "wrong"
                              ? "border-destructive bg-destructive/10"
                              : "border-border hover:bg-accent"
                        }`}
                      >
                        {state === "correct" && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        {state === "wrong" && <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                        <span>{o}</span>
                      </button>
                    );
                  })}
                </div>
                {done && q.explanation && (
                  <div className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {game.flashcards.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
                className="min-h-28 rounded-lg border border-border p-4 text-left hover:border-primary transition-colors"
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                  {flipped[i] ? "Jawaban" : "Pertanyaan"}
                </div>
                <div className="text-sm">{flipped[i] ? c.back : c.front}</div>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="match" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {game.matching.map((p) => {
                const done = matched.includes(p.term);
                return (
                  <button
                    key={p.term}
                    type="button"
                    disabled={done}
                    onClick={() => tryMatch(p.term, undefined)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                      done
                        ? "border-primary bg-primary/10 opacity-60"
                        : picked.term === p.term
                          ? "border-primary"
                          : "border-border hover:bg-accent"
                    }`}
                  >
                    {p.term}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              {shuffledDefs.map((p) => {
                const done = matched.includes(p.term);
                return (
                  <button
                    key={p.definition}
                    type="button"
                    disabled={done}
                    onClick={() => tryMatch(undefined, p.definition)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                      done
                        ? "border-primary bg-primary/10 opacity-60"
                        : picked.def === p.definition
                          ? "border-primary"
                          : "border-border hover:bg-accent"
                    }`}
                  >
                    {p.definition}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            Cocok: {matched.length}/{game.matching.length}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
