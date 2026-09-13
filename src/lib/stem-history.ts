import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  StemAnalysis,
  StemCheatSheetData,
  StemQuestion,
  SubjectId,
} from "@/lib/stem.functions";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export type StemAnalysisRow = {
  id: string;
  user_id: string;
  subject: string;
  topic: string | null;
  title: string;
  payload: StemAnalysis;
  created_at: string;
};

export type StemCheatSheetRow = {
  id: string;
  user_id: string;
  subject: string;
  topic: string | null;
  title: string;
  payload: StemCheatSheetData;
  created_at: string;
};

export type StemQuizAttemptRow = {
  id: string;
  user_id: string;
  subject: string;
  difficulty: string;
  mode: "relaxed" | "exam";
  topic: string | null;
  questions: StemQuestion[];
  answers: Record<number, string>;
  score: number;
  total: number;
  elapsed_seconds: number;
  created_at: string;
};

// ---------- Analyses ----------

export async function saveStemAnalysis(params: {
  subject: SubjectId;
  topic: string | null;
  analysis: StemAnalysis;
}) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("stem_analyses")
    .insert({
      user_id,
      subject: params.subject,
      topic: params.topic,
      title: params.analysis.title,
      payload: params.analysis as unknown as Json,
    })
    .select()
    .single();
  if (error) throw error;
  return data as StemAnalysisRow;
}

export async function listStemAnalyses(limit = 30) {
  const { data, error } = await supabase
    .from("stem_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as StemAnalysisRow[];
}

export async function deleteStemAnalysis(id: string) {
  const { error } = await supabase.from("stem_analyses").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Cheat Sheets ----------

export async function saveStemCheatSheet(params: {
  subject: SubjectId;
  topic: string | null;
  cheatSheet: StemCheatSheetData;
}) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("stem_cheatsheets")
    .insert({
      user_id,
      subject: params.subject,
      topic: params.topic,
      title: params.cheatSheet.title,
      payload: params.cheatSheet as unknown as Json,
    })
    .select()
    .single();
  if (error) throw error;
  return data as StemCheatSheetRow;
}

export async function listStemCheatSheets(limit = 30) {
  const { data, error } = await supabase
    .from("stem_cheatsheets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as StemCheatSheetRow[];
}

export async function deleteStemCheatSheet(id: string) {
  const { error } = await supabase.from("stem_cheatsheets").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Quiz Attempts ----------

export async function saveStemQuizAttempt(params: {
  subject: SubjectId;
  difficulty: string;
  mode: "relaxed" | "exam";
  topic: string | null;
  questions: StemQuestion[];
  answers: Record<number, string>;
  score: number;
  total: number;
  elapsedSeconds: number;
}) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("stem_quiz_attempts")
    .insert({
      user_id,
      subject: params.subject,
      difficulty: params.difficulty,
      mode: params.mode,
      topic: params.topic,
      questions: params.questions as unknown as Json,
      answers: params.answers as unknown as Json,
      score: params.score,
      total: params.total,
      elapsed_seconds: params.elapsedSeconds,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as StemQuizAttemptRow;
}

export async function listStemQuizAttempts(limit = 30) {
  const { data, error } = await supabase
    .from("stem_quiz_attempts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as StemQuizAttemptRow[];
}

export async function deleteStemQuizAttempt(id: string) {
  const { error } = await supabase.from("stem_quiz_attempts").delete().eq("id", id);
  if (error) throw error;
}