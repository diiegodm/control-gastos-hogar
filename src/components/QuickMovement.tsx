import { useState, type FormEvent } from "react";
import { movementCategories, type MovementCategory, type MovementType } from "../types/finance";
import { todayISO } from "../lib/date";
import { numberValue } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";

type Finance = ReturnType<typeof useFinance>;

export function QuickMovement({ finance, onClose }: { finance: Finance; onClose: () => void }) {
  const [type, setType] = useState<MovementType>("Gasto");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const amount = numberValue(form.get("amount"));
    const description = String(form.get("description") || "").trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Introduce un importe mayor que cero.");
      return;
    }
    setSaving(true);
    try {
      await finance.createMovement({
        date: String(form.get("date") || todayISO()),
        type,
        category: String(form.get("category") || "Otros") as MovementCategory,
        description: description || (type === "Ingreso" ? "Ingreso" : "Gasto"),
        amount,
      });
      onClose();
    } catch {
      setError("No se pudo guardar. Inténtalo otra vez.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
    <section className="w-full max-w-lg rounded-t-3xl border border-[#3a484e] bg-[#202d36] p-5 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between"><div><p className="text-sm font-bold text-[#b7f34a]">Registro rápido</p><h2 className="mt-1 text-xl font-black">Nuevo movimiento</h2></div><button className="btn-secondary !min-h-9 !px-3" onClick={onClose} type="button" aria-label="Cerrar">×</button></div>
      <form className="space-y-3" onSubmit={(event) => void submit(event)}>
        <div className="grid grid-cols-2 rounded-xl bg-[#172129] p-1"><button className={`h-10 rounded-lg font-bold ${type === "Gasto" ? "bg-[#45252b] text-[#ff9aa5]" : "text-slate-400"}`} type="button" onClick={() => setType("Gasto")}>Gasto</button><button className={`h-10 rounded-lg font-bold ${type === "Ingreso" ? "bg-[#27371b] text-[#b7f34a]" : "text-slate-400"}`} type="button" onClick={() => setType("Ingreso")}>Ingreso</button></div>
        <input className="input !h-16 text-center text-3xl font-black" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0,00 €" required autoFocus />
        <select className="input" name="category" defaultValue="Mercado">{movementCategories.map((category) => <option key={category}>{category}</option>)}</select>
        <input className="input" name="description" placeholder="Descripción (opcional)" />
        <input className="input" name="date" type="date" defaultValue={todayISO()} required />
        {error ? <p role="alert" className="rounded-xl bg-[#351a20] p-3 text-sm font-semibold text-[#ff9aa5]">{error}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar movimiento"}</button>
      </form>
    </section>
  </div>;
}
