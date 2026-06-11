import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const Input = z.object({
  mode: z.enum(["refine", "summarize"]),
  content: z.string().min(1).max(40000),
});

const REFINE_SYSTEM =
  "Kamu adalah asisten yang merapikan catatan belajar pemrograman. Perbaiki struktur, tata bahasa, tambahkan penjelasan jika kurang, pastikan format Markdown rapi (heading, list, code block). Jangan mengubah makna asli. Output hanya konten yang sudah dirapikan dalam bahasa yang sama.";

const SUMMARIZE_SYSTEM =
  "Ringkas catatan berikut menjadi poin-poin kunci yang mudah dipahami dan diingat. Gunakan bullet list Markdown. Jangan menambahkan informasi di luar isi catatan.";

export const runNoteAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: data.mode === "refine" ? REFINE_SYSTEM : SUMMARIZE_SYSTEM,
      prompt: data.content,
    });
    return { text };
  });
