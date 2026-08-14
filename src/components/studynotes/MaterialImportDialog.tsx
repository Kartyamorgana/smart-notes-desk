import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileUp, Loader2, Mic, Presentation, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ACCEPTED_MATERIAL,
  MAX_MATERIAL_BYTES,
  detectKind,
  extractOfficeText,
  fileToBase64,
  kindLabel,
  type MaterialKind,
} from "@/lib/material";
import { generateNoteFromMaterial, transcribeAudio } from "@/lib/ingest.functions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Content of the currently active note, when the user wants to enrich it. */
  activeContent?: string;
  onCreated: (title: string, content: string) => Promise<void> | void;
  onEnriched: (title: string, content: string) => void;
};

export function MaterialImportDialog({
  open,
  onOpenChange,
  activeContent,
  onCreated,
  onEnriched,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<MaterialKind>("unsupported");
  const [depth, setDepth] = useState<"standard" | "deep">("standard");
  const [target, setTarget] = useState<"new" | "merge">("new");
  const [step, setStep] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const doTranscribe = useServerFn(transcribeAudio);
  const doGenerate = useServerFn(generateNoteFromMaterial);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_MATERIAL_BYTES) {
      toast.error("File terlalu besar", { description: "Maksimal 20 MB." });
      return;
    }
    const k = detectKind(f);
    if (k === "unsupported") {
      toast.error("Format belum didukung", {
        description: "Gunakan PPTX, DOCX, XLSX, PDF, audio (mp3/wav/m4a), atau teks.",
      });
      return;
    }
    setFile(f);
    setKind(k);
  };

  const reset = () => {
    setFile(null);
    setKind("unsupported");
    setStep(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const run = useCallback(async () => {
    if (!file) return;
    try {
      let material: string | undefined;
      let pdfBase64: string | undefined;

      if (kind === "pdf") {
        setStep("Menyiapkan dokumen PDF...");
        pdfBase64 = await fileToBase64(file);
      } else if (kind === "audio") {
        setStep("Mentranskrip audio...");
        const base64 = await fileToBase64(file);
        const res = await doTranscribe({
          data: { base64, mime: file.type || "audio/mpeg", filename: file.name },
        });
        material = res.text;
      } else if (kind === "text") {
        setStep("Membaca berkas...");
        material = await file.text();
      } else {
        setStep("Mengekstrak isi berkas...");
        material = await extractOfficeText(file, kind);
      }

      if (!pdfBase64 && !material?.trim()) {
        throw new Error("Tidak ada teks yang bisa dibaca dari berkas ini");
      }

      setStep("AI menyusun & melengkapi catatan...");
      const note = await doGenerate({
        data: {
          filename: file.name,
          material,
          pdfBase64,
          pdfMime: pdfBase64 ? file.type || "application/pdf" : undefined,
          existingContent: target === "merge" ? activeContent : undefined,
          depth,
        },
      });

      if (target === "merge") onEnriched(note.title, note.content);
      else await onCreated(note.title, note.content);

      toast.success("Catatan lengkap dibuat", { description: note.title });
      onOpenChange(false);
      reset();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("429")) toast.error("Terlalu banyak permintaan, coba lagi sebentar");
      else if (msg.includes("402")) toast.error("Kredit AI habis, tambah kredit di workspace");
      else toast.error("Gagal memproses materi", { description: msg });
    } finally {
      setStep(null);
    }
  }, [file, kind, target, depth, activeContent, doGenerate, doTranscribe, onCreated, onEnriched, onOpenChange]);

  const busy = !!step;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-4 h-4" /> Buat catatan dari materi
          </DialogTitle>
          <DialogDescription>
            Unggah PPT, PDF, Word, Excel, rekaman audio, atau teks. AI akan membaca isinya lalu
            menyusun catatan lengkap — poin garis besar dijelaskan, ditambah contoh, istilah, dan
            rangkuman.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) pick(e.dataTransfer.files?.[0]);
          }}
          onClick={() => !busy && inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
        >
          {file ? (
            <div className="space-y-1">
              <div className="font-medium text-sm break-all">{file.name}</div>
              <div className="text-xs text-muted-foreground">
                {kindLabel(kind)} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <Presentation className="w-5 h-5" />
                <FileText className="w-5 h-5" />
                <Mic className="w-5 h-5" />
              </div>
              <div className="text-sm">Klik atau tarik berkas ke sini</div>
              <div className="text-xs text-muted-foreground">
                PPTX · DOCX · XLSX · PDF · MP3/WAV/M4A · TXT/MD (maks 20 MB)
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MATERIAL}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: "standard", t: "Lengkap", d: "±600-900 kata, padat" },
              { v: "deep", t: "Sangat mendalam", d: "Setara bab buku" },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setDepth(o.v)}
              className={`p-3 rounded-md border-2 text-left transition-colors ${
                depth === o.v ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
              }`}
            >
              <div className="font-medium text-sm">{o.t}</div>
              <div className="text-xs text-muted-foreground">{o.d}</div>
            </button>
          ))}
        </div>

        {activeContent?.trim() ? (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: "new", t: "Catatan baru", d: "Simpan sebagai catatan terpisah" },
                { v: "merge", t: "Lengkapi catatan aktif", d: "Gabung dengan isi sekarang" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setTarget(o.v)}
                className={`p-3 rounded-md border-2 text-left transition-colors ${
                  target === o.v ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                }`}
              >
                <div className="font-medium text-sm">{o.t}</div>
                <div className="text-xs text-muted-foreground">{o.d}</div>
              </button>
            ))}
          </div>
        ) : null}

        {step && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {step}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={run} disabled={!file || busy} className="gap-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Susun catatan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
