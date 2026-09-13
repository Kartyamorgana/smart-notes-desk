import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Lightbulb,
  Timer,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import { ScratchpadDrawer } from "./ScratchpadDrawer";
import {
  generateStemQuiz,
  SUBJECTS,
  type SubjectId,
  type StemQuestion,
} from "@/lib/stem.functions";

type Difficulty = "easy" | "medium" | "hard" | "hots";
const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Mudah" },
  { id: "medium", label: "Sedang" },
  { id: "hard", label: "Sulit" },
  { id: "hots", label: "HOTS / UTBK" },
];
const COUNTS = [5, 8, 10, 15, 20];

function normNum(s: string) {
  return s.replace(/\s|,/g, (m) => (m === "," ? "." : "")).replace(/[^\d.\-+/]/g, "");
}

function isCorrect(q: StemQuestion, given: string) {
  if (!given.trim()) return false;
  if (q.type === "num") {
    const a = Number(normNum(q.answer));
    const b = Number(normNum(given));
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) < 1e-6;
    return normNum(q.answer) === normNum(given);
  }
  return given.trim() === q.answer.trim();
}

export function StemPractice({
  subject,
  material,
  topic,
}: {
  subject: SubjectId;
  material?: string;
  topic?: string;
}) {
  const gen = useServerFn(generateStemQuiz);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [exam, setExam] = useState(false);
  const [minutes, setMinutes] = useState(20);
  const [ownTopic, setOwnTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const [questions, setQuestions] = useState<StemQuestion[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [hintLevel, setHintLevel] = useState<Record<number, number>>({});
  const [left, setLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!questions || finished) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      if (exam) {
        setLeft((v) => {
          if (v <= 1) {
            setFinished(true);
            return 0;
          }
          return v - 1;
        });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [questions, finished, exam]);

  const score = useMemo(() => {
    if (!questions) return 0;
    return questions.reduce(
      (acc, q, i) => acc + (isCorrect(q, answers[i] ?? "") ? 1 : 0),
      0,
    );
  }, [questions, answers]);

  const run = async () => {
    const t = ownTopic.trim() || topic?.trim();
    if (!t && !material?.trim()) {
      toast.error("Analisis materi dulu atau tulis topik soal");
      return;
    }
    setBusy(true);
    try {
      const res = await gen({
        data: {
          subject,
          difficulty,
          count,
          topic: t || undefined,
          material: material?.trim() ? material.slice(0, 120000) : undefined,
        },
      });
      setQuestions(res.questions);
      setIdx(0);
      setAnswers({});
      setRevealed({});
      setHintLevel({});
      setFinished(false);
      setLeft(minutes * 60);
      startedAt.current = Date.now();
      setElapsed(0);
      toast.success(`${res.questions.length} soal siap`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat soal");
    } finally {
      setBusy(false);
    }
  };

  const mmss = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (!questions) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Jumlah soal</div>
          <div className="flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCount(c)}
                aria-pressed={count === c}
                className={`h-9 min-w-11 rounded-lg border px-3 text-xs font-medium transition-colors ${
                  count === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            Tingkat kesulitan
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIFFS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                aria-pressed={difficulty === d.id}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  difficulty === d.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExam(false)}
            aria-pressed={!exam}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              !exam ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
            }`}
          >
            Mode Santai (ada petunjuk)
          </button>
          <button
            type="button"
            onClick={() => setExam(true)}
            aria-pressed={exam}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              exam ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
            }`}
          >
            Mode Ujian (berwaktu)
          </button>
          {exam && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Durasi
              <Input
                type="number"
                min={1}
                max={180}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="h-8 w-20"
              />
              menit
            </label>
          )}
        </div>

        <Input
          value={ownTopic}
          onChange={(e) => setOwnTopic(e.target.value)}
          placeholder={`Topik soal (opsional) — bidang: ${
            SUBJECTS.find((s) => s.id === subject)?.label ?? ""
          }`}
        />

        <Button onClick={run} disabled={busy} className="w-full gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          {busy ? "Menyusun soal…" : "Mulai latihan"}
        </Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="text-center py-4">
          <Trophy className="w-8 h-8 mx-auto text-primary mb-2" />
          <div className="text-3xl font-bold tabular-nums">
            {score}/{questions.length}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Skor {Math.round((score / questions.length) * 100)} · waktu {mmss(elapsed)}
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => {
            const ok = isCorrect(q, answers[i] ?? "");
            return (
              <details key={i} className="rounded-xl border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  <span className={ok ? "text-primary" : "text-destructive"}>
                    {ok ? "✓" : "✗"}
                  </span>{" "}
                  Soal {i + 1} {q.topic ? `· ${q.topic}` : ""}
                </summary>
                <div className="mt-2">
                  <MarkdownPreview source={q.question} />
                  <div className="text-xs text-muted-foreground mt-2">
                    Jawabanmu: <b>{answers[i] || "—"}</b> · Kunci: <b>{q.answer}</b>
                  </div>
                  <div className="mt-2 border-t border-border pt-2">
                    <MarkdownPreview source={q.solution || "_Tidak ada pembahasan._"} />
                  </div>
                </div>
              </details>
            );
          })}
        </div>

        <Button variant="secondary" className="w-full gap-1.5" onClick={() => setQuestions(null)}>
          <RotateCcw className="w-4 h-4" /> Latihan lagi
        </Button>
      </div>
    );
  }

  const q = questions[idx]!;
  const given = answers[idx] ?? "";
  const hints = q.hints ?? [];
  const shown = hintLevel[idx] ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground">
          Soal {idx + 1} dari {questions.length}
          {q.topic ? ` · ${q.topic}` : ""}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Timer className="w-3.5 h-3.5" />
            {exam ? mmss(left) : mmss(elapsed)}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => setFinished(true)}
          >
            Selesai
          </Button>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[15px] leading-relaxed">
          <MarkdownPreview source={q.question} />
        </div>

        <div className="mt-3 space-y-2">
          {q.type === "mc" ? (
            q.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [idx]: opt }))}
                className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  given === opt ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                }`}
              >
                <MarkdownPreview source={opt} />
              </button>
            ))
          ) : (
            <Input
              value={given}
              onChange={(e) => setAnswers((a) => ({ ...a, [idx]: e.target.value }))}
              placeholder="Tulis jawaban berupa angka"
              inputMode="decimal"
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!exam && hints.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              disabled={shown >= hints.length}
              onClick={() => setHintLevel((h) => ({ ...h, [idx]: shown + 1 }))}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {shown === 0
                ? "Butuh Petunjuk?"
                : shown >= hints.length
                  ? "Petunjuk habis"
                  : "Petunjuk lagi"}
            </Button>
          )}

          <ScratchpadDrawer />

          {!exam && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => setRevealed((r) => ({ ...r, [idx]: true }))}
            >
              Lihat pembahasan
            </Button>
          )}
        </div>

        {!exam && shown > 0 && (
          <ol className="mt-3 space-y-1.5 text-sm list-decimal pl-5">
            {hints.slice(0, shown).map((h, i) => (
              <li key={i} className="text-muted-foreground">
                <MarkdownPreview source={h} />
              </li>
            ))}
          </ol>
        )}

        {!exam && revealed[idx] && (
          <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Pembahasan</div>
            <MarkdownPreview source={q.solution || `**Jawaban: ${q.answer}**`} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="flex-1 gap-1"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="w-4 h-4" /> Sebelumnya
        </Button>
        {idx === questions.length - 1 ? (
          <Button className="flex-1" onClick={() => setFinished(true)}>
            Kumpulkan
          </Button>
        ) : (
          <Button className="flex-1 gap-1" onClick={() => setIdx((i) => i + 1)}>
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}