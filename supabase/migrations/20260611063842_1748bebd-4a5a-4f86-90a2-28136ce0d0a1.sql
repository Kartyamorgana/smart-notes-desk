
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_folder_id ON public.notes(folder_id);
CREATE INDEX idx_notes_title ON public.notes(title);
CREATE INDEX idx_folders_parent_id ON public.folders(parent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO anon, authenticated;
GRANT ALL ON public.folders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO anon, authenticated;
GRANT ALL ON public.notes TO service_role;

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public folders access" ON public.folders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public notes access" ON public.notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
