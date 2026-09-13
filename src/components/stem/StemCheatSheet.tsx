import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BookmarkPlus,
  Check,
  ClipboardCheck,
  Copy,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import {
  cheatSheetToMarkdown,
  generateStemCheatSheet,
  SUBJECTS,
  type StemCheatSheetData,
  type SubjectId,
} from "@/lib/stem.functions";

function CopyFormulaButton({ latex }: { latex: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Salin rumus"
      className="text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(`$${latex}$`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function StemCheatSheet({
  subject,
  material,
  topic,
  onSaveNote,
}: {
  subject: SubjectId;
  material?: string;
  topic?: string;
  onSaveNote: (title: string, markdown: string) => void;
}) {
  const gen = useServerFn(generateStemCheatSheet);
  const [ownTopic, setOwnTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StemCheatSheetData | null>(null);
  const [query, setQuery] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);

  const run = useCallback(async () => {
    const t = ownTopic.trim() || topic?.trim();
    if (!t && !material?.trim()) {
      toast.error("Tulis topik atau analisis materi dulu");
      return;
    }
    setBusy(true);
    try {
      const res = await gen({
        data: {
          subject,
          topic: t || undefined,
          material: material?.trim() ? material.slice(0, 120000) : undefined,
        },
      });
      setResult(res);
      setQuery("");
      toast.success("Cheat sheet siap");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat cheat sheet");
    } finally {
      setBusy(false);
    }
  }, [ownTopic, topic, material, subject, gen]);

  const totalFormulas = useMemo(
    () => result?.sections.reduce((n, s) => n + s.formulas.length, 0) ?? 0,
    [result],
  );

  const filtered = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    if (!q) return result.sections;
    return result.sections.filter((s) => {
      const blob = [
        s.heading,
        s.brief,
        ...s.formulas.flatMap((f) => [f.latex, f.label]),
        ...s.tips,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [result, query]);

  const copyAll = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(cheatSheetToMarkdown(result));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
    toast.success("Markdown disalin");
  }, [result]);

  // --- Form ---
  if (!result) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">Cheat Sheet & Notes Ringkas</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ringkasan formula-first: rumus kunci, kondisi pakai, trik, dan glosarium mini.
              Fokus pemahaman kuantitatif — tanpa esai panjang.
            </p>
          </div>
        </div>

        <Input
          value={ownTopic}
          onChange={(e) => setOwnTopic(e.target.value)}
          placeholder={`Topik cheat sheet (opsional) — bidang: ${
            SUBJECTS.find((s) => s.id === subject)?.label ?? ""
          }`}
        />

        <Button onClick={run} disabled={busy} className="w-full gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? "Menyusun cheat sheet…" : "Buat cheat sheet"}
        </Button>

        <p className="text-[11px] text-muted-foreground">
          Tip: setelah analisis materi di tab sebelumnya, cheat sheet akan otomatis memakai materi
          tersebut sebagai acuan.
        </p>
      </div>
    );
  }

  // --- Hasil ---
  return (
    <div className="space-y-4">
      {/* Header + stats */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight wrap-break-word">{result.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> {result.sections.length} konsep
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> {totalFormulas} rumus
              </span>
              {result.quickRefs.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  📖 {result.quickRefs.length} istilah
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              onClick={copyAll}
            >
              {copiedAll ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAll ? "Tersalin" : "Salin MD"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs gap-1"
              onClick={() => onSaveNote(result.title, cheatSheetToMarkdown(result))}
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> Simpan ke Notes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setResult(null)}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari rumus, konsep, atau istilah…"
            className="pl-8 h-9 bg-background"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Tidak ada hasil untuk "{query}"
          </div>
        )}

        {filtered.map((s, i) => (
          <section
            key={`${s.heading}-${i}`}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="border-l-4 border-primary bg-muted/40 px-4 py-2.5">
              <h3 className="font-semibold text-[15px] tracking-tight">{s.heading}</h3>
            </div>

            <div className="p-4 space-y-3">
              {s.brief && (
                <div className="text-sm text-foreground/90 leading-relaxed">
                  <MarkdownPreview source={s.brief} />
                </div>
              )}

              {s.formulas.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Rumus
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {s.formulas.map((f, j) => (
                      <div
                        key={j}
                        className="group rounded-xl border border-border bg-background p-2.5 transition-colors hover:border-primary/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 overflow-x-auto text-[15px] flex-1">
                            <MarkdownPreview source={`$$${f.latex}$$`} />
                          </div>
                          <CopyFormulaButton latex={f.latex} />
                        </div>
                        {f.label && (
                          <div className="mt-1 text-[11px] text-muted-foreground leading-snug">
                            {f.label}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {s.tips.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Tips &amp; Jebakan
                  </div>
                  <ul className="space-y-1 text-sm">
                    {s.tips.map((t, j) => (
                      <li key={j} className="flex gap-2 text-foreground/90">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        <div className="min-w-0">
                          <MarkdownPreview source={t} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Glosarium */}
      {result.quickRefs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            📖 Glosarium
          </div>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {result.quickRefs.map((q, i) => (
              <div key={i} className="flex flex-col gap-0.5 py-1 border-b border-border/50 last:border-0">
                <dt className="text-[13px] font-semibold text-foreground">{q.term}</dt>
                <dd className="text-xs text-muted-foreground leading-snug">
                  <MarkdownPreview source={q.meaning} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}