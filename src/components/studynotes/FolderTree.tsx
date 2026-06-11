import { useState, useMemo } from "react";
import {
  Folder as FolderIcon,
  FolderOpen,
  FileText,
  Plus,
  MoreVertical,
  Pin,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  FolderPlus,
} from "lucide-react";
import type { Folder, Note } from "@/lib/db";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  folders: Folder[];
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
};

export function FolderTree(props: Props) {
  const {
    folders,
    notes,
    activeNoteId,
    onSelectNote,
    onCreateNote,
    onDeleteNote,
    onTogglePin,
    onMoveNote,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
  } = props;

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | "root" | null>(null);

  const childMap = useMemo(() => {
    const m: Record<string, Folder[]> = { root: [] };
    folders.forEach((f) => {
      const key = f.parent_id ?? "root";
      (m[key] ??= []).push(f);
    });
    return m;
  }, [folders]);

  const notesByFolder = useMemo(() => {
    const m: Record<string, Note[]> = { unfiled: [] };
    notes.forEach((n) => {
      const key = n.folder_id ?? "unfiled";
      (m[key] ??= []).push(n);
    });
    Object.values(m).forEach((arr) =>
      arr.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updated_at.localeCompare(a.updated_at);
      })
    );
    return m;
  }, [notes]);

  const toggle = (id: string) => setOpenFolders((p) => ({ ...p, [id]: !p[id] }));

  const handleDrop = (folderId: string | null) => {
    if (dragNoteId) onMoveNote(dragNoteId, folderId);
    setDragNoteId(null);
    setDragOver(null);
  };

  const renderNote = (n: Note) => (
    <div
      key={n.id}
      draggable
      onDragStart={() => setDragNoteId(n.id)}
      onDragEnd={() => {
        setDragNoteId(null);
        setDragOver(null);
      }}
      onClick={() => onSelectNote(n.id)}
      className={`group flex items-center gap-2 pl-6 pr-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
        activeNoteId === n.id
          ? "bg-primary/15 text-foreground"
          : "hover:bg-accent text-foreground/85"
      }`}
    >
      {n.pinned ? (
        <Pin className="w-3.5 h-3.5 text-primary shrink-0 fill-primary" />
      ) : (
        <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate flex-1">{n.title || "Untitled"}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background rounded">
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => onTogglePin(n.id)}>
            <Pin className="w-4 h-4 mr-2" /> {n.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderIcon className="w-4 h-4 mr-2" /> Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onMoveNote(n.id, null)}>
                (Unfiled)
              </DropdownMenuItem>
              {folders.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => onMoveNote(n.id, f.id)}>
                  {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDeleteNote(n.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderFolder = (f: Folder, depth: number) => {
    const open = openFolders[f.id] ?? true;
    const kids = childMap[f.id] ?? [];
    const folderNotes = notesByFolder[f.id] ?? [];
    return (
      <div key={f.id}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(f.id);
          }}
          onDragLeave={() => setDragOver((p) => (p === f.id ? null : p))}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(f.id);
          }}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          className={`group flex items-center gap-1 pr-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-accent ${
            dragOver === f.id ? "bg-primary/10 ring-1 ring-primary" : ""
          }`}
        >
          <button onClick={() => toggle(f.id)} className="p-0.5">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {open ? (
            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <FolderIcon className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className="truncate flex-1 font-medium" onClick={() => toggle(f.id)}>
            {f.name}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background rounded">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateNote(f.id)}>
                <Plus className="w-4 h-4 mr-2" /> New note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateFolder(f.id)}>
                <FolderPlus className="w-4 h-4 mr-2" /> New subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRenameFolder(f.id)}>
                <Edit2 className="w-4 h-4 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteFolder(f.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {open && (
          <div className="animate-fade-in">
            {kids.map((k) => renderFolder(k, depth + 1))}
            <div style={{ paddingLeft: `${depth * 12}px` }}>
              {folderNotes.map(renderNote)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const rootFolders = childMap.root ?? [];
  const unfiled = notesByFolder.unfiled ?? [];

  return (
    <div className="space-y-0.5">
      {rootFolders.map((f) => renderFolder(f, 0))}
      {unfiled.length > 0 && (
        <div
          className={`mt-2 ${dragOver === "root" ? "bg-primary/10 ring-1 ring-primary rounded-md" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("root");
          }}
          onDragLeave={() => setDragOver((p) => (p === "root" ? null : p))}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(null);
          }}
        >
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Unfiled
          </div>
          {unfiled.map(renderNote)}
        </div>
      )}
    </div>
  );
}
