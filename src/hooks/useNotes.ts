import { useEffect, useMemo, useState } from "react";
import type { Note, NoteInput } from "../types/notes";

const STORAGE_KEY = "finanzas-hogar-notes-v1";

function makeId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

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
    addNote,
    updateNote,
    deleteNote,
  };
}
