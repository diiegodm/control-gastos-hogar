import { useEffect, useState, type FormEvent } from "react";
import { EmptyState } from "../components/EmptyState";
import { formatLongDate, todayISO } from "../lib/date";
import { currency, numberValue } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { FixedExpense, FixedStatus } from "../types/finance";

type Finance = ReturnType<typeof useFinance>;
type ModalMode = "create" | "edit" | "details";

const alertClasses = {
  green: "bg-[#26371c] text-[#b7f34a] ring-[#475e30]",
  yellow: "bg-[#352c1b] text-[#ffd166] ring-[#5d4a2a]",
  red: "bg-[#351f25] text-[#ff9aa5] ring-[#5b343d]",
};

function conceptIcon(concept: string) {
  const normalized = concept.toLocaleLowerCase("es");
  if (/estudio|escuela|universidad|curso|colegiatura/.test(normalized)) return "▤";
  if (/alquiler|renta|hipoteca|vivienda/.test(normalized)) return "⌂";
  if (/internet|teléfono|movil|móvil/.test(normalized)) return "⌁";
  if (/luz|electricidad|agua|gas/.test(normalized)) return "ϟ";
  if (/gimnasio|deporte/.test(normalized)) return "↗";
  if (/seguro/.test(normalized)) return "◇";
  return "◉";
}

export function FixedExpenses({ finance }: { finance: Finance }) {
  const [selected, setSelected] = useState<(FixedExpense & { dueDateForSelectedMonth: string; daysRemaining: number; alert: "green" | "yellow" | "red" }) | null>(null);
  const [mode, setMode] = useState<ModalMode | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mode) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const previousHeight = root.style.getPropertyValue("--modal-vh");
    const previousTop = root.style.getPropertyValue("--modal-top");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const syncViewport = () => {
      root.style.setProperty("--modal-vh", `${viewport?.height ?? window.innerHeight}px`);
      root.style.setProperty("--modal-top", `${viewport?.offsetTop ?? 0}px`);
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);

    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      document.body.style.overflow = previousOverflow;
      if (previousHeight) root.style.setProperty("--modal-vh", previousHeight);
      else root.style.removeProperty("--modal-vh");
      if (previousTop) root.style.setProperty("--modal-top", previousTop);
      else root.style.removeProperty("--modal-top");
    };
  }, [mode]);

  function openCreate() {
    setSelected(null);
    setError("");
    setMode("create");
  }

  function openDetails(expense: NonNullable<typeof selected>) {
    setSelected(expense);
    setError("");
    setMode("details");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const concept = String(form.get("concept") || "").trim();
    const amount = numberValue(form.get("amount"));
    const payDay = Math.min(31, Math.max(1, numberValue(form.get("payDay"))));
    if (!concept) { setError("Escribe el nombre del cargo fijo."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setError("El importe debe ser mayor que cero."); return; }
    const payload = {
      concept,
      amount,
      payDay,
      dueDate: String(form.get("dueDate") || todayISO()),
      status: String(form.get("status") || "Pendiente") as FixedStatus,
    };

    if (mode === "edit" && selected) await finance.updateFixedExpense(selected.id, payload);
    else await finance.createFixedExpense(payload);
    setMode(null);
    setSelected(null);
  }

  async function remove() {
    if (!selected || !confirm(`¿Eliminar el cargo fijo "${selected.concept}"?`)) return;
    await finance.removeFixedExpense(selected.id);
    setSelected(null);
    setMode(null);
  }

  const formExpense = mode === "edit" ? selected : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-400">Pagos mensuales</p>
          <h1 className="mt-1 text-2xl font-black text-slate-50">Gastos recurrentes</h1>
          <p className="mt-1 text-sm text-slate-400">Añade cualquier cargo fijo de tu hogar.</p>
        </div>
        <button className="btn-primary shrink-0" type="button" onClick={openCreate}>+ Añadir</button>
      </div>

      <div className="space-y-3">
        {finance.fixedForMonth.length ? finance.fixedForMonth.map((expense) => (
          <button
            key={expense.id}
            className="group w-full rounded-2xl border border-[#384750]/80 bg-gradient-to-br from-[#24323b] to-[#1a252d] p-4 text-left shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition hover:border-[#71854d]/70 hover:from-[#293942] active:scale-[0.995]"
            type="button"
            onClick={() => openDetails(expense)}
            aria-label={`Abrir ${expense.concept}, ${currency(expense.amount)} al mes`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/5 bg-[#31414a] text-xl text-[#b7f34a]">{conceptIcon(expense.concept)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-black text-slate-50">{expense.concept}</p>
                  <p className="shrink-0 text-lg font-black text-slate-50">{currency(expense.amount)}<span className="ml-1 text-xs font-semibold text-slate-400">/mes</span></p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-slate-400">Próximo cargo · {formatLongDate(expense.dueDateForSelectedMonth)}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${alertClasses[expense.alert]}`}>
                    {expense.status === "Pagado" ? "Pagado" : expense.daysRemaining < 0 ? "Vencido" : `${expense.daysRemaining} días`}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#3a484f]"><span className="block h-full rounded-full bg-[#b7f34a]" style={{ width: expense.status === "Pagado" ? "100%" : expense.daysRemaining < 0 ? "100%" : `${Math.max(8, Math.min(100, 100 - expense.daysRemaining * 3))}%` }} /></span>
                  <span className="text-[0.68rem] font-semibold text-slate-500">Día {expense.payDay}</span>
                </div>
              </div>
            </div>
          </button>
        )) : <EmptyState title="Aún no tienes cargos fijos" body="Crea cualquier cargo: cuota de estudios, préstamo, gimnasio, alquiler o suscripción." />}
      </div>

      {mode ? (
        <div className="fixed inset-x-0 z-50 flex items-end justify-center overflow-hidden bg-black/70 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm sm:items-center" style={{ top: "var(--modal-top, 0px)", height: "var(--modal-vh, 100dvh)" }} onClick={() => setMode(null)}>
          <section className="min-w-0 w-full max-w-lg touch-pan-y overflow-y-auto overscroll-contain rounded-t-3xl border border-[#3b4a52] bg-[#202d36] p-5 shadow-2xl sm:rounded-3xl" style={{ maxHeight: "calc(var(--modal-vh, 100dvh) - var(--modal-top, 0px) - env(safe-area-inset-top) - 0.75rem)", WebkitOverflowScrolling: "touch" }} onClick={(event) => event.stopPropagation()}>
            {mode === "details" && selected ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#31414a] text-xl text-[#b7f34a]">{conceptIcon(selected.concept)}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-400">Cargo recurrente</p><h2 className="mt-0.5 text-xl font-black">{selected.concept}</h2></div>
                  <button className="btn-secondary !min-h-9 !px-3" type="button" onClick={() => setMode(null)} aria-label="Cerrar">×</button>
                </div>
                <div className="my-5 rounded-2xl border border-[#35454d] bg-[#19242b] p-4"><p className="text-3xl font-black text-[#b7f34a]">{currency(selected.amount)}<span className="ml-2 text-sm font-semibold text-slate-400">al mes</span></p><p className="mt-3 text-sm text-slate-300">Próximo vencimiento: {formatLongDate(selected.dueDateForSelectedMonth)}</p><p className="mt-1 text-sm text-slate-400">Día habitual de pago: {selected.payDay}</p><p className="mt-1 text-sm text-slate-400">Estado: {selected.status}</p></div>
                <div className="grid grid-cols-2 gap-2"><button className="btn-primary" type="button" onClick={() => setMode("edit")}>Editar cargo</button><button className="btn-danger" type="button" onClick={() => void remove()}>Eliminar</button></div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#b7f34a]">Espacios · Recurrentes</p><h2 className="mt-1 text-xl font-black">{mode === "edit" ? "Editar cargo fijo" : "Nuevo cargo fijo"}</h2><p className="mt-1 text-sm text-slate-400">El nombre es libre; puedes escribir cualquier gasto recurrente.</p></div><button className="btn-secondary !min-h-9 !px-3" type="button" onClick={() => setMode(mode === "edit" ? "details" : null)} aria-label="Cerrar">×</button></div>
                <form className="space-y-3" onSubmit={(event) => void submit(event)}>
                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Nombre del cargo</span><input className="input min-w-0 max-w-full" name="concept" placeholder="Ej. Cuota fija de estudios" defaultValue={formExpense?.concept ?? ""} required /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Importe mensual</span><input className="input" name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" placeholder="0,00 €" defaultValue={formExpense?.amount ?? ""} required /></label>
                    <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Día de pago</span><input className="input" name="payDay" type="number" min="1" max="31" placeholder="1-31" defaultValue={formExpense?.payDay ?? ""} required /></label>
                  </div>
                  <label className="block min-w-0"><span className="mb-1 block text-xs font-bold text-slate-400">Próximo vencimiento</span><input className="input block min-w-0 max-w-full appearance-none" style={{ width: "100%" }} name="dueDate" type="date" defaultValue={formExpense?.dueDate ?? todayISO()} required /></label>
                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Estado</span><select className="input" name="status" defaultValue={formExpense?.status ?? "Pendiente"}><option>Pendiente</option><option>Pagado</option></select></label>
                  {error ? <p role="alert" className="rounded-xl bg-[#351f25] p-3 text-sm font-semibold text-[#ff9aa5]">{error}</p> : null}
                  <div className="grid grid-cols-2 gap-2"><button className="btn-secondary" type="button" onClick={() => setMode(mode === "edit" ? "details" : null)}>Cancelar</button><button className="btn-primary" type="submit">{mode === "edit" ? "Guardar cambios" : "Crear cargo"}</button></div>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
