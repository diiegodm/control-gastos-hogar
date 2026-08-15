import { useMemo, useState, type FormEvent } from "react";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import type { useNotes } from "../hooks/useNotes";
import type { Note, NoteInput } from "../types/notes";

type NotesModel = ReturnType<typeof useNotes>;

const emptyNote: NoteInput = {
  title: "",
  body: "",
};

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function NoteForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Note;
  onCancel: () => void;
  onSubmit: (input: NoteInput) => void;
}) {
  const [form, setForm] = useState<NoteInput>(
    initial ? { title: initial.title, body: initial.body } : emptyNote,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    const body = form.body.trim();
    if (!title && !body) return;
    onSubmit({
      title: title || body.slice(0, 40) || "Nota sin título",
      body,
    });
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <input
        className="input"
        placeholder="Título"
        value={form.title}
        onChange={(event) => setForm({ ...form, title: event.target.value })}
      />
      <textarea
        className="input min-h-56 py-3"
        placeholder="Escribe tu nota..."
        value={form.body}
        onChange={(event) => setForm({ ...form, body: event.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-primary" type="submit">
          Guardar
        </button>
      </div>
    </form>
  );
}

export function Notes({ notes }: { notes: NotesModel }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Note | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return notes.notes;
    return notes.notes.filter(
      (note) =>
        note.title.toLowerCase().includes(normalized) ||
        note.body.toLowerCase().includes(normalized),
    );
  }, [notes.notes, query]);

  function openNewNote() {
    setEditing(undefined);
    setIsFormOpen(true);
  }

  function openEditNote(note: Note) {
    setEditing(note);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditing(undefined);
    setIsFormOpen(false);
  }

  function saveNote(input: NoteInput) {
    if (editing) {
      notes.updateNote(editing.id, input);
    } else {
      notes.addNote(input);
    }
    closeForm();
  }

  function removeNote(note: Note) {
    if (window.confirm(`¿Eliminar "${note.title}"?`)) {
      notes.deleteNote(note.id);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] bg-slate-950 p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-slate-300">Blog de notas</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">Notas rápidas</h1>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Apunta cosas sueltas sin registrarlas como gastos todavía.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="input"
          placeholder="Buscar notas"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="btn-primary" type="button" onClick={openNewNote}>
          Nueva nota
        </button>
      </div>

      {filteredNotes.length > 0 ? (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <Card key={note.id}>
              <button className="w-full text-left" type="button" onClick={() => openEditNote(note)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">{note.title}</h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                      Editada {formatNoteDate(note.updatedAt)}
                    </p>
                  </div>
                </div>
                {note.body ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{note.body}</p>
                ) : null}
              </button>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="btn-secondary" type="button" onClick={() => openEditNote(note)}>
                  Editar
                </button>
                <button className="btn-danger" type="button" onClick={() => removeNote(note)}>
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState title="Sin notas" body="Guarda recordatorios, ideas o apuntes rápidos." />
          <button className="btn-primary mt-3 w-full" type="button" onClick={openNewNote}>
            Crear primera nota
          </button>
        </Card>
      )}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm" onClick={closeForm}>
          <div
            className="mx-auto max-h-[calc(100dvh-2rem)] max-w-lg overflow-auto rounded-[1.5rem] bg-white p-4 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {editing ? "Editar nota" : "Nueva nota"}
                </h2>
                <p className="text-sm text-slate-500">Para pendientes, compras o apuntes sueltos.</p>
              </div>
              <button className="btn-secondary shrink-0" type="button" onClick={closeForm}>
                Cerrar
              </button>
            </div>
            <NoteForm initial={editing} onCancel={closeForm} onSubmit={saveNote} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
