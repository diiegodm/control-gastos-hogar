import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { EmptyState } from "../components/EmptyState";
import { currentYearMonth, dueDateForMonth, formatLongDate } from "../lib/date";
import { currency, fromCents, numberValue, parseAmount, toCents } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { FixedExpense } from "../types/finance";

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
  const [selected, setSelected] = useState<(FixedExpense & { dueDateForSelectedMonth: string; daysRemaining: number; alert: "green" | "yellow" | "red"; isPaid: boolean }) | null>(null);
  const [mode, setMode] = useState<ModalMode | null>(null);
  const [error, setError] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const modalRef = useRef<HTMLElement | null>(null);

  function revealField(target: EventTarget) {
    if (!(target instanceof HTMLElement)) return;
    window.setTimeout(() => {
      const panel = modalRef.current;
      if (!panel?.contains(target)) return;
      const field = target.getBoundingClientRect();
      const bounds = panel.getBoundingClientRect();
      const margin = 24;
      if (field.bottom > bounds.bottom - margin) {
        panel.scrollBy({ top: field.bottom - bounds.bottom + margin, behavior: "smooth" });
      } else if (field.top < bounds.top + margin) {
        panel.scrollBy({ top: field.top - bounds.top - margin, behavior: "smooth" });
      }
    }, 100);
  }

  useEffect(() => {
    if (!mode) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const previousHeight = root.style.getPropertyValue("--modal-vh");
    const previousOverflow = document.body.style.overflow;
    const previousModalAttribute = document.body.getAttribute("data-fixed-modal");
    const initialViewportHeight = viewport?.height ?? window.innerHeight;
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-fixed-modal", "open");

    const syncViewport = (revealFocusedField = false) => {
      const height = viewport?.height ?? window.innerHeight;
      root.style.setProperty("--modal-vh", `${height}px`);
      setKeyboardOpen(height < initialViewportHeight - 100);
      const focused = document.activeElement;
      if (revealFocusedField && focused instanceof HTMLElement && modalRef.current?.contains(focused)) {
        revealField(focused);
      }
    };
    syncViewport();
    const updateViewport = () => syncViewport();
    const revealFocusedField = () => syncViewport(true);
    viewport?.addEventListener("resize", revealFocusedField);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", revealFocusedField);

    return () => {
      viewport?.removeEventListener("resize", revealFocusedField);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", revealFocusedField);
      document.body.style.overflow = previousOverflow;
      if (previousModalAttribute) document.body.setAttribute("data-fixed-modal", previousModalAttribute);
      else document.body.removeAttribute("data-fixed-modal");
      setKeyboardOpen(false);
      if (previousHeight) root.style.setProperty("--modal-vh", previousHeight);
      else root.style.removeProperty("--modal-vh");
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
    const amount = parseAmount(String(form.get("amount") ?? ""));
    const payDay = Math.min(31, Math.max(1, numberValue(form.get("payDay"))));
    if (!concept) { setError("Escribe el nombre del cargo fijo."); return; }
    if (amount === null || amount <= 0) { setError("El importe debe ser válido y mayor que cero. Puedes usar coma decimal."); return; }
    const startMonth = String(form.get("startMonth") || currentYearMonth());
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) { setError("Elige un mes de inicio válido."); return; }
    const payload = {
      concept,
      amountCents: toCents(amount),
      payDay,
      startMonth,
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
            aria-label={`Abrir ${expense.concept}, ${currency(fromCents(expense.amountCents))} al mes`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/5 bg-[#31414a] text-xl text-[#b7f34a]">{conceptIcon(expense.concept)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-black text-slate-50">{expense.concept}</p>
                  <p className="shrink-0 text-lg font-black text-slate-50">{currency(fromCents(expense.amountCents))}<span className="ml-1 text-xs font-semibold text-slate-400">/mes</span></p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-slate-400">Próximo cargo · {formatLongDate(expense.dueDateForSelectedMonth)}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${alertClasses[expense.alert]}`}>
                    {expense.isPaid ? "Pagado" : expense.daysRemaining < 0 ? "Vencido" : `${expense.daysRemaining} días`}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#3a484f]"><span className="block h-full rounded-full bg-[#b7f34a]" style={{ width: expense.isPaid ? "100%" : expense.daysRemaining < 0 ? "100%" : `${Math.max(8, Math.min(100, 100 - expense.daysRemaining * 3))}%` }} /></span>
                  <span className="text-[0.68rem] font-semibold text-slate-500">Día {expense.payDay}</span>
                </div>
              </div>
            </div>
          </button>
        )) : <EmptyState title="Aún no tienes cargos fijos" body="Crea cualquier cargo: cuota de estudios, préstamo, gimnasio, alquiler o suscripción." />}
      </div>

      {mode ? createPortal(
        <div className={`fixed inset-0 z-50 flex justify-center overflow-hidden bg-black/70 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm ${keyboardOpen ? "items-start" : "items-center"}`} style={{ height: "var(--modal-vh, 100dvh)" }} onClick={() => setMode(null)}>
          <section ref={modalRef} data-fixed-modal-scroll className="min-w-0 w-full max-w-lg touch-pan-y overflow-y-auto overscroll-contain rounded-3xl border border-[#3b4a52] bg-[#202d36] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl" style={{ maxHeight: "calc(var(--modal-vh, 100dvh) - env(safe-area-inset-top) - 1.5rem)", WebkitOverflowScrolling: "touch" }} onFocusCapture={(event) => revealField(event.target)} onClick={(event) => event.stopPropagation()}>
            {mode === "details" && selected ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#31414a] text-xl text-[#b7f34a]">{conceptIcon(selected.concept)}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-400">Cargo recurrente</p><h2 className="mt-0.5 text-xl font-black">{selected.concept}</h2></div>
                  <button className="btn-secondary !min-h-9 !px-3" type="button" onClick={() => setMode(null)} aria-label="Cerrar">×</button>
                </div>
                <div className="my-5 rounded-2xl border border-[#35454d] bg-[#19242b] p-4"><p className="text-3xl font-black text-[#b7f34a]">{currency(fromCents(selected.amountCents))}<span className="ml-2 text-sm font-semibold text-slate-400">al mes</span></p><p className="mt-3 text-sm text-slate-300">Próximo vencimiento: {formatLongDate(dueDateForMonth(selected.payDay, finance.selectedYm))}</p><p className="mt-1 text-sm text-slate-400">Día habitual de pago: {selected.payDay}</p><p className="mt-1 text-sm text-slate-400">Desde: {selected.startMonth}</p><p className="mt-1 text-sm text-slate-400">Estado este mes: {selected.isPaid ? "Pagado" : "Pendiente"}</p></div>
                <div className="grid grid-cols-2 gap-2"><button className="btn-primary" type="button" onClick={() => { void finance.markFixedPaid(selected.id).then(() => setMode(null)); }}>{selected.isPaid ? "Deshacer pago" : "Marcar pagado"}</button><button className="btn-secondary" type="button" onClick={() => setMode("edit")}>Editar cargo</button><button className="btn-danger col-span-2" type="button" onClick={() => void remove()}>Eliminar</button></div>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#b7f34a]">Espacios · Recurrentes</p><h2 className="mt-1 text-xl font-black">{mode === "edit" ? "Editar cargo fijo" : "Nuevo cargo fijo"}</h2><p className="mt-1 text-sm text-slate-400">El nombre es libre; puedes escribir cualquier gasto recurrente.</p></div><button className="btn-secondary !min-h-9 !px-3" type="button" onClick={() => setMode(mode === "edit" ? "details" : null)} aria-label="Cerrar">×</button></div>
                <form className="space-y-3" onSubmit={(event) => void submit(event)}>
                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Nombre del cargo</span><input className="input min-w-0 max-w-full" name="concept" placeholder="Ej. Cuota fija de estudios" defaultValue={formExpense?.concept ?? ""} required /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Importe mensual</span><input className="input" name="amount" type="text" inputMode="decimal" placeholder="0,00 €" defaultValue={formExpense ? fromCents(formExpense.amountCents) : ""} required /></label>
                    <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Día de pago</span><input className="input" name="payDay" type="number" min="1" max="31" placeholder="1-31" defaultValue={formExpense?.payDay ?? ""} required /></label>
                  </div>
                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Desde</span><input className="input" name="startMonth" type="month" defaultValue={formExpense?.startMonth ?? currentYearMonth()} required /></label>
                  {error ? <p role="alert" className="rounded-xl bg-[#351f25] p-3 text-sm font-semibold text-[#ff9aa5]">{error}</p> : null}
                  <div className="grid grid-cols-2 gap-2"><button className="btn-secondary" type="button" onClick={() => setMode(mode === "edit" ? "details" : null)}>Cancelar</button><button className="btn-primary" type="submit">{mode === "edit" ? "Guardar cambios" : "Crear cargo"}</button></div>
                </form>
              </>
            )}
          </section>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
