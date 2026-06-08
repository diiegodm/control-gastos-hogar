import { useRef, useState } from "react";
import { BottomNav, type Section } from "./components/BottomNav";
import { Dashboard } from "./views/Dashboard";
import { FixedExpenses } from "./views/FixedExpenses";
import { Market } from "./views/Market";
import { Movements } from "./views/Movements";
import { useFinance } from "./hooks/useFinance";
import { months } from "./lib/date";
import type { BackupPayload } from "./types/finance";

const initialMonth = new Date().getMonth();

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const finance = useFinance(selectedMonth);
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
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Hogar</p>
            <p className="text-xl font-black tracking-normal text-slate-950">Finanzas</p>
          </button>
          <div className="flex items-center gap-2">
            <button className="btn-secondary hidden sm:inline-flex" type="button" onClick={() => void finance.backup()}>
              Exportar
            </button>
            <button className="btn-secondary hidden sm:inline-flex" type="button" onClick={() => importRef.current?.click()}>
              Importar
            </button>
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

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5">
        {section === "dashboard" ? (
          <Dashboard selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} finance={finance} />
        ) : null}
        {section === "movements" ? (
          <Movements selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} finance={finance} />
        ) : null}
        {section === "fixed" ? <FixedExpenses finance={finance} /> : null}
        {section === "market" ? (
          <Market selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} finance={finance} />
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:hidden">
          <button className="btn-secondary" type="button" onClick={() => void finance.backup()}>
            Exportar JSON
          </button>
          <button className="btn-secondary" type="button" onClick={() => importRef.current?.click()}>
            Importar JSON
          </button>
        </div>
      </main>

      <BottomNav active={section} onChange={setSection} />
    </div>
  );
}
