import { useRef, useState } from "react";
import { BottomNav, type Section } from "./components/BottomNav";
import { Dashboard } from "./views/Dashboard";
import { Spaces } from "./views/Spaces";
import { Analysis } from "./views/Analysis";
import { Profile } from "./views/Profile";
import { QuickMovement } from "./components/QuickMovement";
import { useFinance } from "./hooks/useFinance";
import { useNotes } from "./hooks/useNotes";
import { useSpaces } from "./hooks/useSpaces";
import { useLocalAuth } from "./hooks/useLocalAuth";
import { LocalAccess } from "./components/LocalAccess";
import { currentYearMonth, monthOption } from "./lib/date";
import { parseBackup } from "./lib/storage";

const initialMonth = currentYearMonth();

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const [selectedYm, setSelectedYm] = useState(initialMonth);
  const [showQuickMovement, setShowQuickMovement] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const finance = useFinance(selectedYm);
  const notes = useNotes();
  const spaces = useSpaces();
  const auth = useLocalAuth();
  const importRef = useRef<HTMLInputElement | null>(null);

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImportFeedback(null);
    try {
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text) as unknown;
      } catch (error) {
        const detail = error instanceof Error ? error.message : "formato JSON no reconocido";
        throw new Error(`El archivo no contiene un JSON válido: ${detail}`);
      }
      const payload = parseBackup(raw);
      if (!confirm("Antes de reemplazar los datos se descargará una copia del estado actual. ¿Continuar con la importación?")) return;
      await finance.backup();
      await finance.restore(payload);
      setImportFeedback({ type: "success", message: "Respaldo importado correctamente. Se descargó una copia de los datos anteriores." });
    } catch (error) {
      setImportFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo completar la importación.",
      });
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function exportCurrentBackup() {
    setImportFeedback(null);
    try {
      await finance.backup();
      setImportFeedback({ type: "success", message: "Respaldo descargado correctamente." });
    } catch (error) {
      setImportFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo exportar el respaldo.",
      });
    }
  }

  if (!auth.ready || auth.needsSetup || !auth.unlocked) {
    return <LocalAccess auth={auth} />;
  }

  if (finance.loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-app px-6 text-center">
        <div>
          <div className="mx-auto h-12 w-12 animate-pulse rounded-3xl bg-slate-950" />
          <p className="mt-4 font-bold text-slate-700">Preparando tus finanzas...</p>
        </div>
      </main>
    );
  }

  if (finance.loadError) {
    return <main className="flex min-h-dvh items-center justify-center bg-app px-5 text-slate-100"><section className="w-full max-w-md rounded-2xl border border-[#3b4a52] bg-[#202d36] p-5"><h1 className="text-xl font-black">No se pudieron cargar tus datos</h1><p role="alert" className="mt-2 text-sm text-slate-300">{finance.loadError}</p><button className="btn-primary mt-4 w-full" type="button" onClick={finance.retry}>Reintentar</button></section></main>;
  }

  return (
    <div className="min-h-dvh bg-app text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-app/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSection("dashboard")}
            className="text-left"
            aria-label="Ir al Dashboard"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#b7f34a]">FINANZAS HOGAR</p>
            <p className="text-xl font-black tracking-normal text-slate-950">Finanzas</p>
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
              {monthOption(selectedYm).shortLabel} {monthOption(selectedYm).year}
            </span>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-10 md:pt-24">
        {[spaces.storageError, notes.storageError].filter((message): message is string => Boolean(message)).map((message) => <p key={message} role="alert" className="mb-4 rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200">{message}</p>)}
        <div key={section} className="page-transition">
          {section === "dashboard" ? (
            <Dashboard selectedYm={selectedYm} onMonthChange={setSelectedYm} finance={finance} spaces={spaces} onOpenSpaces={() => setSection("spaces")} />
          ) : null}
          {section === "spaces" ? <Spaces finance={finance} notes={notes} spaces={spaces} selectedYm={selectedYm} onMonthChange={setSelectedYm} /> : null}
          {section === "analysis" ? <Analysis finance={finance} selectedYm={selectedYm} onMonthChange={setSelectedYm} /> : null}
          {section === "profile" ? <Profile name={auth.name} onLock={auth.lock} onExport={() => void exportCurrentBackup()} onImport={() => importRef.current?.click()} importFeedback={importFeedback} /> : null}
        </div>
      </main>

      <BottomNav active={section} onChange={setSection} onAdd={() => setShowQuickMovement(true)} />
      {showQuickMovement ? <QuickMovement finance={finance} customCategories={[...spaces.budgetCategories, ...spaces.movementCategories]} budgetSpaces={spaces.budgets} onCreateCategory={spaces.addMovementCategory} onClose={() => setShowQuickMovement(false)} /> : null}
    </div>
  );
}
