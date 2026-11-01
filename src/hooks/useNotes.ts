import { useEffect, useMemo, useState } from "react";
import type { Note, NoteInput } from "../types/notes";

const STORAGE_KEY = "finanzas-hogar-notes-v1";
type LoadResult = { notes: Note[]; canPersist: boolean; error: string | null };

function makeId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function loadNotes(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { notes: [], canPersist: true, error: null };
    const parsed = JSON.parse(raw) as unknown;
    const valid = Array.isArray(parsed) && parsed.every((note) => Boolean(note) && typeof note === "object"
      && typeof note.id === "string" && typeof note.title === "string" && typeof note.body === "string"
      && typeof note.createdAt === "string" && typeof note.updatedAt === "string");
    return valid
      ? { notes: parsed as Note[], canPersist: true, error: null }
      : { notes: [], canPersist: false, error: "No se pudieron leer tus notas guardadas; no se sobrescribirán." };
  } catch {
    return { notes: [], canPersist: false, error: "No se pudieron leer tus notas guardadas; no se sobrescribirán." };
  }
}

export function useNotes() {
  const [initial] = useState(loadNotes);
  const [notes, setNotes] = useState<Note[]>(initial.notes);
  const [canPersist, setCanPersist] = useState(initial.canPersist);
  const [storageError, setStorageError] = useState<string | null>(initial.error);

  useEffect(() => {
    if (!canPersist) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setStorageError(null);
    } catch {
      setStorageError("No se pudieron guardar las notas en este dispositivo.");
    }
  }, [canPersist, notes]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notes],
  );

  function addNote(input: NoteInput) {
    const timestamp = nowISO();
    setNotes((current) => [
      {
        id: makeId(),
        title: input.title.trim(),
        body: input.body.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      ...current,
    ]);
  }

  function updateNote(id: string, input: NoteInput) {
    setNotes((current) =>
      current.map((note) =>
        note.id === id
          ? {
              ...note,
              title: input.title.trim(),
              body: input.body.trim(),
              updatedAt: nowISO(),
            }
          : note,
      ),
    );
  }

  function deleteNote(id: string) {
    setNotes((current) => current.filter((note) => note.id !== id));
  }

  return {
    notes: sortedNotes,
    storageError,
    addNote,
    updateNote,
    deleteNote,
  };
}
