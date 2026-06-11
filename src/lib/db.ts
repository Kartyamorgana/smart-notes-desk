import { supabase } from "@/integrations/supabase/client";

export type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export async function fetchAll() {
  const [foldersRes, notesRes] = await Promise.all([
    supabase.from("folders").select("*").order("created_at"),
    supabase.from("notes").select("*").order("updated_at", { ascending: false }),
  ]);
  if (foldersRes.error) throw foldersRes.error;
  if (notesRes.error) throw notesRes.error;
  return {
    folders: (foldersRes.data ?? []) as Folder[],
    notes: (notesRes.data ?? []) as Note[],
  };
}

export async function createFolder(name: string, parent_id: string | null = null) {
  const { data, error } = await supabase
    .from("folders")
    .insert({ name, parent_id })
    .select()
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function renameFolder(id: string, name: string) {
  const { error } = await supabase.from("folders").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteFolder(id: string) {
  const { error } = await supabase.from("folders").delete().eq("id", id);
  if (error) throw error;
}

export async function createNote(folder_id: string | null) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ title: "Untitled", content: "", folder_id })
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

export async function updateNote(id: string, patch: Partial<Note>) {
  const { error } = await supabase.from("notes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
