import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SUBJECTS = [
  { id: "umum", label: "Penalaran Umum" },
  { id: "kuantitatif", label: "Pengetahuan Kuantitatif" },
  { id: "matematika", label: "Penalaran Matematika" },
  { id: "custom", label: "Mata Pelajaran Lain" },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];

const SUBJECT_BRIEF: Record<string, string> = {
  umum:
    "Penalaran Umum SNBT: penalaran induktif/deduktif, penalaran kuantitatif sederhana, analisis pernyataan, silogisme, pola, dan kesimpulan logis dari teks.",
  kuantitatif:
    "Pengetahuan Kuantitatif SNBT: bilangan, aljabar dasar, aritmetika sosial, perbandingan, himpunan, geometri dasar, statistika, dan peluang.",
  matematika:
    "Penalaran Matematika SNBT: soal cerita kontekstual (literasi matematika) yang menuntut pemodelan, penalaran multi-langkah, dan interpretasi data.",
  custom: "Mata pelajaran STEM umum (matematika, fisika, kimia, logika) sesuai materi yang diberikan.",
};

const MATH_RULE =
  "RUMUS (WAJIB): setiap notasi matematika/kimia dibungkus pembatas math — inline `$...$`, blok `$$...$$`. Jangan pernah menulis \\frac, \\sqrt, \\sum, subskrip, atau superskrip di luar pembatas math, dan jangan menaruh rumus di dalam code block.";

const AnalyzeInput = z.object({
  subject: z.enum(["umum", "kuantitatif", "matematika", "custom"]).default("custom"),
  topic: z.string().max(400).optional(),
  filename: z.string().max(300).optional(),
  material: z.string().max(200000).optional(),
  fileBase64: z.string().optional(),
  fileMime: z.string().optional(),
});

const AnalyzeSchema = z.object({
  title: z.string().min(1),
  overview: z.string().default(""),
  concepts: z.string().default(""),
  formulas: z.string().default(""),
  cheatsheet: z
    .array(
      z.object({
        name: z.string(),
        latex: z.string(),
        when: z.string().default(""),
      }),
    )
    .default([]),
  pitfalls: z.string().default(""),
});

export type StemAnalysis = z.infer<typeof AnalyzeSchema>;

function parseJson<T>(raw: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Format hasil AI tidak valid");
    return schema.parse(JSON.parse(m[0]));
  }
}

export const analyzeStemMaterial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");


    const system = [
      "Kamu tutor STEM & SNBT yang menjelaskan materi hitungan (matematika, fisika, kimia, logika) dengan bahasa sederhana namun akurat.",
      `Fokus bidang: ${SUBJECT_BRIEF[data.subject]}`,
      'Balas HANYA JSON valid tanpa code fence: {"title":string,"overview":string,"concepts":string,"formulas":string,"cheatsheet":[{"name":string,"latex":string,"when":string}],"pitfalls":string}',
      "- overview: Markdown 3-5 baris berisi inti materi dan kenapa penting untuk SNBT.",
      "- concepts: Markdown lengkap. Untuk setiap konsep gunakan `### <konsep>`, lalu penjelasan bahasa sehari-hari, analogi, langkah berpikir bernomor, dan minimal satu contoh perhitungan lengkap.",
      "- formulas: Markdown khusus rumus. Setiap rumus ditulis sebagai blok `$$...$$` diikuti penjelasan tiap variabel dan syarat pemakaian.",
      "- cheatsheet: daftar rumus kunci; `latex` HANYA isi LaTeX tanpa pembatas $ (contoh: `v = \\\\frac{s}{t}`), `when` = kapan dipakai (maks 1 kalimat).",
      "- pitfalls: Markdown bullet kesalahan umum + cara menghindarinya.",
      MATH_RULE,
      "Gunakan Bahasa Indonesia.",
    ].join("\n");

    const blocks: Parameters<typeof chat>[1] = [];
    if (data.topic?.trim()) {
      blocks.push({ type: "text", text: `Topik yang diminta pengguna: ${data.topic}` });
    }
    if (data.fileBase64) {
      const mime = data.fileMime ?? "application/pdf";
      if (mime.startsWith("image/")) {
        blocks.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${data.fileBase64}` },
        });
      } else {
        blocks.push({
          type: "file",
          file: {
            filename: data.filename ?? "materi.pdf",
            file_data: `data:${mime};base64,${data.fileBase64}`,
          },
        });
      }
      blocks.push({ type: "text", text: "Analisis materi pada lampiran di atas." });
    }
    if (data.material?.trim()) {
      blocks.push({ type: "text", text: `=== ISI MATERI ===\n${data.material.slice(0, 200000)}` });
    }
    if (!blocks.length) throw new Error("Tidak ada materi atau topik yang dikirim");

    return parseJson(stripFences(await chat(system, blocks)), AnalyzeSchema);
  });

const QuizInput = z.object({
  subject: z.enum(["umum", "kuantitatif", "matematika", "custom"]).default("custom"),
  difficulty: z.enum(["easy", "medium", "hard", "hots"]).default("medium"),
  count: z.number().int().min(3).max(20).default(5),
  topic: z.string().max(400).optional(),
  material: z.string().max(120000).optional(),
});

const QuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        type: z.enum(["mc", "num"]).default("mc"),
        options: z.array(z.string()).default([]),
        answer: z.string().min(1),
        hints: z.array(z.string()).default([]),
        solution: z.string().default(""),
        topic: z.string().default(""),
      }),
    )
    .min(1),
});

export type StemQuestion = z.infer<typeof QuizSchema>["questions"][number];

const DIFF: Record<string, string> = {
  easy: "Mudah: satu langkah hitung, angka ramah, konteks singkat.",
  medium: "Sedang: 2-3 langkah, sedikit konversi satuan atau pemodelan sederhana.",
  hard: "Sulit: 3-5 langkah, angka menantang, pengecoh berbasis miskonsepsi umum.",
  hots:
    "HOTS: menuntut analisis, evaluasi, dan sintesis. Soal cerita panjang bergaya UTBK dengan data/tabel, informasi pengecoh, dan pemodelan multi-konsep. Tetap dapat diselesaikan hanya dengan konsep dari materi.",
};

export const generateStemQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data }) => {
    const { chat, stripFences } = await import("./ingest.server");

    const system = [
      "Kamu penyusun soal SNBT/UTBK dan olimpiade STEM.",
      `Bidang: ${SUBJECT_BRIEF[data.subject]}`,
      'Balas HANYA JSON valid tanpa code fence: {"questions":[{"question":string,"type":"mc"|"num","options":[string],"answer":string,"hints":[string],"solution":string,"topic":string}]}',
      `Buat tepat ${data.count} soal. Mayoritas berbentuk soal cerita (word problem) bergaya SNBT asli.`,
      DIFF[data.difficulty],
      '- type "mc": 4-5 opsi, "answer" = teks opsi yang benar (harus identik dengan salah satu options).',
      '- type "num": tanpa options, "answer" = angka saja (gunakan titik desimal, tanpa satuan).',
      "- Sertakan minimal 20% soal type \"num\" bila cocok.",
      '- "hints": 2-4 petunjuk konseptual berurutan, dari paling umum ke paling spesifik, TANPA membocorkan jawaban akhir.',
      '- "solution": pembahasan langkah demi langkah dalam Markdown bernomor, lengkap dengan perhitungan dan kesimpulan `**Jawaban: ...**`.',
      '- "topic": label singkat konsep yang diuji.',
      MATH_RULE,
      "Gunakan Bahasa Indonesia.",
    ].join("\n");

    const blocks: { type: "text"; text: string }[] = [];
    if (data.topic?.trim()) blocks.push({ type: "text", text: `Topik: ${data.topic}` });
    if (data.material?.trim())
      blocks.push({
        type: "text",
        text: `=== MATERI ACUAN (soal harus berakar pada konsep di sini) ===\n${data.material.slice(0, 120000)}`,
      });
    if (!blocks.length) throw new Error("Tidak ada materi atau topik untuk membuat soal");

    const res = parseJson(stripFences(await chat(system, blocks)), QuizSchema);
    const questions = res.questions.filter(
      (q) => q.type === "num" || (q.options.length >= 2 && q.options.includes(q.answer)),
    );
    if (!questions.length) throw new Error("AI tidak menghasilkan soal yang valid");
    return { questions: questions.slice(0, data.count) };
  });
