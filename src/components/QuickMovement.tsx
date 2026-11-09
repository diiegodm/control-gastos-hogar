import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { movementCategories, type MovementCategory, type MovementType } from "../types/finance";
import { todayISO } from "../lib/date";
import { parseAmount, toCents } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { BudgetSpace } from "../types/spaces";

type Finance = ReturnType<typeof useFinance>;

export function QuickMovement({ finance, customCategories = [], budgetSpaces = [], onCreateCategory, onClose }: { finance: Finance; customCategories?: string[]; budgetSpaces?: BudgetSpace[]; onCreateCategory: (category: string) => string; onClose: () => void }) {
  const [type, setType] = useState<MovementType>("Gasto");
  const [category, setCategory] = useState("Mercado");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const categories = [...new Set([...movementCategories, ...customCategories, ...finance.movements.map((movement) => movement.category)])];

  function revealFocusedField() {
    window.setTimeout(() => {
      const panel = panelRef.current;
      const focused = document.activeElement;
      if (!panel || !(focused instanceof HTMLElement) || !panel.contains(focused)) return;
      const field = focused.getBoundingClientRect();
      const bounds = panel.getBoundingClientRect();
      const margin = 20;
      if (field.bottom > bounds.bottom - margin) {
        panel.scrollBy({ top: field.bottom - bounds.bottom + margin, behavior: "smooth" });
      } else if (field.top < bounds.top + margin) {
        panel.scrollBy({ top: field.top - bounds.top - margin, behavior: "smooth" });
      }
    }, 120);
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousModalAttribute = document.body.getAttribute("data-fixed-modal");
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-fixed-modal", "open");

    window.visualViewport?.addEventListener("resize", revealFocusedField);
    return () => {
      window.visualViewport?.removeEventListener("resize", revealFocusedField);
      document.body.style.overflow = previousOverflow;
      if (previousModalAttribute) document.body.setAttribute("data-fixed-modal", previousModalAttribute);
      else document.body.removeAttribute("data-fixed-modal");
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const amount = parseAmount(String(form.get("amount") ?? ""));
    const description = String(form.get("description") || "").trim();
    if (amount === null || amount <= 0) {
      setError("Introduce un importe mayor que cero.");
      return;
    }
    setSaving(true);
    try {
      await finance.createMovement({
        date: String(form.get("date") || todayISO()),
        type,
        category: category as MovementCategory,
        budgetSpaceId: String(form.get("budgetSpaceId") || "") || undefined,
        description: description || (type === "Ingreso" ? "Ingreso" : "Gasto"),
        amountCents: toCents(amount),
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar. Inténtalo otra vez.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(<div className="fixed inset-x-0 top-0 z-50 flex items-start justify-center overflow-hidden bg-black/70 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm" style={{ height: "100dvh" }} onClick={onClose}>
    <section ref={panelRef} className="min-w-0 w-full max-w-lg touch-pan-y overflow-y-auto overscroll-contain rounded-3xl border border-[#3a484e] bg-[#202d36] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl" style={{ maxHeight: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)", WebkitOverflowScrolling: "touch" }} onFocusCapture={revealFocusedField} onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between"><div><p className="text-sm font-bold text-[#b7f34a]">Registro rápido</p><h2 className="mt-1 text-xl font-black">Nuevo movimiento</h2></div><button className="btn-secondary !min-h-9 !px-3" onClick={onClose} type="button" aria-label="Cerrar">×</button></div>
      <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <div className="grid grid-cols-2 rounded-xl bg-[#172129] p-1"><button className={`h-10 rounded-lg font-bold ${type === "Gasto" ? "bg-[#45252b] text-[#ff9aa5]" : "text-slate-400"}`} type="button" onClick={() => setType("Gasto")}>Gasto</button><button className={`h-10 rounded-lg font-bold ${type === "Ingreso" ? "bg-[#27371b] text-[#b7f34a]" : "text-slate-400"}`} type="button" onClick={() => setType("Ingreso")}>Ingreso</button></div>
        <input className="input !h-16 text-center text-3xl font-black" name="amount" type="text" inputMode="decimal" placeholder="0,00 €" required />
        <div className="block"><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="quick-movement-category">Categoría</label><select className="input" id="quick-movement-category" name="category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><button className="mt-2 text-sm font-bold text-[#b7f34a]" type="button" onClick={() => setShowNewCategory((value) => !value)}>{showNewCategory ? "Cancelar nueva categoría" : "+ Crear categoría"}</button>{showNewCategory ? <div className="mt-2 flex gap-2"><input className="input min-w-0 flex-1" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nombre de la categoría" /><button className="btn-secondary shrink-0" type="button" onClick={() => { const saved = onCreateCategory(newCategory); if (saved) { setCategory(saved); setNewCategory(""); setShowNewCategory(false); } }}>Guardar</button></div> : null}</div>
        {type === "Gasto" ? <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Presupuesto asociado (opcional)</span><select className="input" name="budgetSpaceId" defaultValue=""><option value="">Sin asignar</option>{budgetSpaces.filter((space) => !space.archived).map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label> : null}
        <input className="input" name="description" placeholder="Concepto o descripción" />
        <input className="input" name="date" type="date" defaultValue={todayISO()} required />
        {error ? <p role="alert" className="rounded-xl bg-[#351a20] p-3 text-sm font-semibold text-[#ff9aa5]">{error}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar movimiento"}</button>
      </form>
    </section>
  </div>, document.body);
}
