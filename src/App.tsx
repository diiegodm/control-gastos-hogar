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
import { months } from "./lib/date";
import type { BackupPayload } from "./types/finance";

const initialMonth = new Date().getMonth();

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [showQuickMovement, setShowQuickMovement] = useState(false);
  const finance = useFinance(selectedMonth);
  const notes = useNotes();
  const spaces = useSpaces();
  const auth = useLocalAuth();
  const importRef = useRef<HTMLInputElement | null>(null);

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BackupPayload;
      if (confirm("Esto reemplazará los datos actuales por el respaldo. ¿Continuar?")) {
        await finance.restore(payload);
      }
    } catch {
      alert("No se pudo importar el respaldo. Revisa que sea un JSON válido de esta app.");
    } finally {
      if (importRef.current) importRef.current.value = "";
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
              {months[selectedMonth].shortLabel}
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
        {section === "dashboard" ? (
          <Dashboard selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} finance={finance} spaces={spaces} onOpenSpaces={() => setSection("spaces")} />
        ) : null}
        {section === "spaces" ? <Spaces finance={finance} notes={notes} spaces={spaces} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} /> : null}
        {section === "analysis" ? <Analysis finance={finance} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} /> : null}
        {section === "profile" ? <Profile name={auth.name} onLock={auth.lock} onExport={() => void finance.backup()} onImport={() => importRef.current?.click()} /> : null}
      </main>

      <BottomNav active={section} onChange={setSection} onAdd={() => setShowQuickMovement(true)} />
      {showQuickMovement ? <QuickMovement finance={finance} onClose={() => setShowQuickMovement(false)} /> : null}
    </div>
  );
}
