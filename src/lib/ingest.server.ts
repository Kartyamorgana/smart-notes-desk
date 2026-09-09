const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const CHAT_MODEL = "google/gemini-3-flash-preview";

function key() {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("Missing LOVABLE_API_KEY");
  return k;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } }
  | { type: "image_url"; image_url: { url: string } };

export async function chat(system: string, blocks: ContentBlock[]) {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: blocks },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`AI ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("AI mengembalikan hasil kosong");
  return text;
}

export async function transcribe(base64: string, mime: string, filename: string) {
  const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("model", "openai/gpt-4o-transcribe");
  form.append("file", new Blob([bin], { type: mime }), filename);
  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Transkripsi ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as { text?: string };
  const text = (json.text ?? "").trim();
  if (!text) throw new Error("Audio tidak menghasilkan teks (mungkin sunyi)");
  return text;
}

export function stripFences(s: string) {
  const t = s.trim();
  const m = t.match(/^```(?:json|markdown|md)?\s*\n([\s\S]*?)\n```$/);
  return m ? m[1] : t;
}
