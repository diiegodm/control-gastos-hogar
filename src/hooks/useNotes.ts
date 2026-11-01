import { useEffect, useMemo, useState } from "react";
import { createId, deleteItem, getAll, putItem } from "../lib/db";
import type { Note, NoteInput } from "../types/notes";

function nowISO(): string { return new Date().toISOString(); }

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = await getAll("notes");
        if (active) setNotes(saved);
        if (active) setStorageError(null);
      } catch (error) {
        if (active) setStorageError(error instanceof Error ? error.message : "No se pudieron leer las notas locales.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const reload = () => void load();
    window.addEventListener("finance-data-restored", reload);
    return () => { active = false; window.removeEventListener("finance-data-restored", reload); };
  }, []);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notes],
  );

  async function addNote(input: NoteInput) {
    const timestamp = nowISO();
    const note: Note = { id: createId("note"), title: input.title.trim(), body: input.body.trim(), createdAt: timestamp, updatedAt: timestamp };
    try { await putItem("notes", note); setNotes((current) => [note, ...current]); setStorageError(null); }
    catch (error) { setStorageError(error instanceof Error ? error.message : "No se pudo guardar la nota."); throw error; }
  }

  async function updateNote(id: string, input: NoteInput) {
    const current = notes.find((note) => note.id === id);
    if (!current) return;
    const note = { ...current, title: input.title.trim(), body: input.body.trim(), updatedAt: nowISO() };
    try { await putItem("notes", note); setNotes((items) => items.map((item) => item.id === id ? note : item)); setStorageError(null); }
    catch (error) { setStorageError(error instanceof Error ? error.message : "No se pudo actualizar la nota."); throw error; }
  }

  async function deleteNote(id: string) {
    try { await deleteItem("notes", id); setNotes((items) => items.filter((note) => note.id !== id)); setStorageError(null); }
    catch (error) { setStorageError(error instanceof Error ? error.message : "No se pudo eliminar la nota."); throw error; }
  }

  return { notes: sortedNotes, loading, storageError, addNote, updateNote, deleteNote };
}
