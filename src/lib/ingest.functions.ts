import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TranscribeInput = z.object({
  base64: z.string().min(1),
  mime: z.string().min(1),
  filename: z.string().min(1),
});

const MaterialInput = z.object({
  filename: z.string().min(1),
  material: z.string().max(200000).optional(),
  pdfBase64: z.string().optional(),
  pdfMime: z.string().optional(),
  existingContent: z.string().max(60000).optional(),
  depth: z.enum(["standard", "deep", "ultra", "mega"]).default("standard"),
});

const OutlineInput = z.object({
  filename: z.string().min(1),
  material: z.string().max(200000).optional(),
  pdfBase64: z.string().optional(),
  pdfMime: z.string().optional(),
  existingContent: z.string().max(60000).optional(),
  sectionCount: z.number().int().min(3).max(40).default(12),
});

const ExpandInput = z.object({
  title: z.string().min(1),
  digest: z.string().max(120000),
  heading: z.string().min(1),
  points: z.array(z.string()).default([]),
  outlineHeadings: z.array(z.string()).default([]),
  targetWords: z.number().int().min(300).max(4000).default(1200),
  index: z.number().int().min(0).default(0),
  total: z.number().int().min(1).default(1),
});

const GameInput = z.object({
  content: z.string().min(20).max(1000000),
});

/** Pecah catatan panjang jadi beberapa bagian seimbang berdasarkan heading. */
function chunkNote(content: string, maxChunks: number, maxChars: number) {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let cur: string[] = [];
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line) && cur.join("\n").trim().length > 400) {
      blocks.push(cur.join("\n"));
      cur = [];
    }
    cur.push(line);
  }
  if (cur.length) blocks.push(cur.join("\n"));

  const chunks: string[] = [];
  let buf = "";
  for (const b of blocks) {
    const piece = b.length > maxChars ? b.slice(0, maxChars) : b;
    if (buf && buf.length + piece.length > maxChars) {
      chunks.push(buf);
      buf = piece;
    } else {
      buf = buf ? `${buf}\n${piece}` : piece;
    }
  }
  if (buf.trim()) chunks.push(buf);

  if (chunks.length <= maxChunks) return chunks;
  // ambil secara merata agar seluruh catatan terwakili
  const step = chunks.length / maxChunks;
  return Array.from({ length: maxChunks }, (_, i) => chunks[Math.floor(i * step)]!);
}


export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TranscribeInput.parse(d))
  .handler(async ({ data }) => {
    const { transcribe } = await import("./ingest.server");
    return { text: await transcribe(data.base64, data.mime, data.filename) };
  });

export const generateNoteFromMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MaterialInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");

    const system = [
      "Kamu adalah tutor ahli yang mengubah materi belajar (slide PPT, transkrip audio/video, PDF, dokumen) menjadi catatan belajar Markdown yang LENGKAP dan mandiri.",
      "Materi sumber biasanya hanya garis besar / poin singkat. Tugasmu MELENGKAPI: jelaskan setiap poin secara utuh, tambahkan definisi, konteks, cara kerja, contoh nyata, contoh kode bila topiknya teknis, analogi sederhana, kesalahan umum, dan rangkuman.",
      "Aturan output:",
      "- Baris pertama: `# <Judul catatan>` (judul deskriptif, bukan nama file).",
      "- Struktur: `## Ringkasan Singkat`, `## Konsep Inti` (subbagian per topik dengan penjelasan paragraf + bullet), `## Contoh & Penerapan`, `## Istilah Penting` (tabel istilah–penjelasan), `## Kesalahan Umum`, `## Poin Kunci untuk Diingat`, `## Pertanyaan Refleksi`.",
      "- Setiap topik dari materi WAJIB muncul; jangan ada poin sumber yang hilang.",
      "- Tandai informasi tambahan yang kamu simpulkan sendiri (bukan dari materi) dengan awalan `_(pelengkap)_` supaya pengguna tahu.",
      "- Gunakan bahasa yang sama dengan materi (default Bahasa Indonesia). Gunakan code block berlabel bahasa untuk kode.",
      "- Keluarkan HANYA Markdown, tanpa penjelasan tambahan dan tanpa membungkusnya dalam code fence.",
      data.depth === "standard"
        ? "- Buat catatan padat namun lengkap, sekitar 800-1200 kata."
        : "- Buat catatan sangat mendalam (setara bab buku), minimal 2000 kata.",
      data.existingContent
        ? "Pengguna sudah punya catatan lama (diberikan di bawah). Gabungkan: pertahankan isi yang benar, perbaiki yang salah, dan lengkapi yang kurang menjadi satu catatan utuh."
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const blocks: Parameters<typeof chat>[1] = [];
    blocks.push({ type: "text", text: `Nama file materi: ${data.filename}` });
    if (data.existingContent?.trim()) {
      blocks.push({
        type: "text",
        text: `=== CATATAN LAMA PENGGUNA ===\n${data.existingContent}`,
      });
    }
    if (data.pdfBase64) {
      blocks.push({
        type: "file",
        file: {
          filename: data.filename,
          file_data: `data:${data.pdfMime ?? "application/pdf"};base64,${data.pdfBase64}`,
        },
      });
      blocks.push({ type: "text", text: "Buat catatan lengkap dari dokumen di atas." });
    } else {
      blocks.push({
        type: "text",
        text: `=== ISI MATERI ===\n${(data.material ?? "").slice(0, 200000)}`,
      });
    }

    const text = stripFences(await chat(system, blocks));
    const firstLine = text.split("\n")[0] ?? "";
    const title = firstLine.startsWith("# ")
      ? firstLine.slice(2).trim()
      : data.filename.replace(/\.[^.]+$/, "");
    const content = firstLine.startsWith("# ")
      ? text.split("\n").slice(1).join("\n").trim()
      : text;
    return { title: title.slice(0, 120), content };
  });

export const generateStudyGame = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GameInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");
    const system = [
      "Kamu membuat materi latihan interaktif dari sebuah catatan belajar.",
      "Balas HANYA JSON valid (tanpa code fence) dengan bentuk:",
      '{"quiz":[{"question":string,"options":[string,string,string,string],"answer":0,"explanation":string}],"flashcards":[{"front":string,"back":string}],"matching":[{"term":string,"definition":string}]}',
      "Buat 8 soal quiz pilihan ganda (indeks jawaban 0-3, pengecoh masuk akal, sertakan penjelasan singkat), 8 flashcard, dan 6 pasangan istilah–definisi.",
      "Semua isi harus bersumber dari catatan. Gunakan bahasa yang sama dengan catatan.",
    ].join("\n");
    const raw = stripFences(await chat(system, [{ type: "text", text: data.content }]));
    const Parsed = z.object({
      quiz: z
        .array(
          z.object({
            question: z.string(),
            options: z.array(z.string()).min(2),
            answer: z.number().int().min(0),
            explanation: z.string().default(""),
          }),
        )
        .default([]),
      flashcards: z.array(z.object({ front: z.string(), back: z.string() })).default([]),
      matching: z
        .array(z.object({ term: z.string(), definition: z.string() }))
        .default([]),
    });
    try {
      return Parsed.parse(JSON.parse(raw));
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Format hasil AI tidak valid");
      return Parsed.parse(JSON.parse(m[0]));
    }
  });

/** Tahap 1 dari catatan super panjang: rangka bab + ringkasan materi (digest). */
export const planNoteOutline = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => OutlineInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");
    const system = [
      "Kamu perancang buku belajar. Dari materi mentah (slide, transkrip, dokumen) kamu menyusun RANGKA buku catatan yang sangat lengkap.",
      `Balas HANYA JSON valid tanpa code fence: {"title":string,"digest":string,"sections":[{"heading":string,"points":[string]}]}`,
      `- "title": judul buku catatan yang deskriptif (bukan nama file).`,
      `- "digest": ringkasan padat SEMUA isi materi (1500-3000 kata) berisi seluruh fakta, angka, istilah, contoh, dan urutan penjelasan penting. Ini akan dipakai sebagai satu-satunya sumber pada tahap penulisan berikutnya, jadi jangan ada informasi penting yang hilang.`,
      `- "sections": tepat ${data.sectionCount} bagian berurutan yang menutup seluruh materi tanpa tumpang tindih. Setiap bagian punya 4-8 "points" berisi subtopik yang harus dibahas (boleh subtopik pelengkap yang belum ada di materi tapi wajib dipahami).`,
      "Gunakan bahasa yang sama dengan materi (default Bahasa Indonesia).",
    ].join("\n");

    const blocks: Parameters<typeof chat>[1] = [
      { type: "text", text: `Nama file materi: ${data.filename}` },
    ];
    if (data.existingContent?.trim()) {
      blocks.push({ type: "text", text: `=== CATATAN LAMA PENGGUNA ===\n${data.existingContent}` });
    }
    if (data.pdfBase64) {
      blocks.push({
        type: "file",
        file: {
          filename: data.filename,
          file_data: `data:${data.pdfMime ?? "application/pdf"};base64,${data.pdfBase64}`,
        },
      });
      blocks.push({ type: "text", text: "Susun rangka dan digest dari dokumen di atas." });
    } else {
      blocks.push({
        type: "text",
        text: `=== ISI MATERI ===\n${(data.material ?? "").slice(0, 200000)}`,
      });
    }

    const raw = stripFences(await chat(system, blocks));
    const Parsed = z.object({
      title: z.string().min(1),
      digest: z.string().default(""),
      sections: z
        .array(z.object({ heading: z.string().min(1), points: z.array(z.string()).default([]) }))
        .min(1),
    });
    try {
      return Parsed.parse(JSON.parse(raw));
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Format rangka dari AI tidak valid");
      return Parsed.parse(JSON.parse(m[0]));
    }
  });

/** Tahap 2: tulis satu bagian panjang berdasarkan rangka + digest. */
export const expandNoteSection = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExpandInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");
    const system = [
      "Kamu penulis buku ajar. Tulis SATU bagian catatan belajar yang sangat mendalam dalam Markdown.",
      `Judul buku: "${data.title}". Ini bagian ${data.index + 1} dari ${data.total}.`,
      `Panjang target: ${data.targetWords}-${Math.round(data.targetWords * 1.4)} kata. Jangan lebih pendek dari target.`,
      "Aturan:",
      `- Mulai dengan heading \`## ${data.heading}\`, lalu gunakan \`###\` untuk setiap subtopik.`,
      "- Setiap subtopik: definisi, penjelasan bertahap (paragraf utuh, bukan hanya bullet), cara kerja/alur, minimal satu contoh konkret, analogi sederhana, kesalahan umum, dan tips mengingat.",
      "- Sertakan tabel Markdown bila membandingkan hal, dan code block berlabel bahasa bila topiknya teknis.",
      "- Akhiri bagian dengan `> **Inti bagian ini:**` berisi 3-5 bullet ringkasan.",
      "- Informasi pelengkap di luar materi tandai `_(pelengkap)_`.",
      "- JANGAN menulis ulang isi bagian lain (daftar bagian diberikan agar kamu tidak tumpang tindih).",
      "- Keluarkan HANYA Markdown bagian ini, tanpa pembuka/penutup meta dan tanpa code fence pembungkus.",
      "Gunakan bahasa yang sama dengan materi (default Bahasa Indonesia).",
    ].join("\n");

    const text = stripFences(
      await chat(system, [
        { type: "text", text: `=== DAFTAR SEMUA BAGIAN ===\n${data.outlineHeadings.join("\n")}` },
        {
          type: "text",
          text: `=== SUBTOPIK YANG HARUS DIBAHAS DI BAGIAN INI ===\n${data.points.join("\n")}`,
        },
        { type: "text", text: `=== RINGKASAN MATERI SUMBER ===\n${data.digest}` },
      ]),
    );
    return { markdown: text.trim() };
  });
