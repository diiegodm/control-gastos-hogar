import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { MonthSelector } from "../components/MonthSelector";
import { formatLongDate, todayISO } from "../lib/date";
import { currency, fromCents, parseAmount, toCents } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { Movement, MovementCategory, MovementType } from "../types/finance";
import { movementCategories } from "../types/finance";
import type { BudgetSpace } from "../types/spaces";

type Finance = ReturnType<typeof useFinance>;

type Props = {
  selectedYm: string;
  onMonthChange: (ym: string) => void;
  finance: Finance;
  customCategories?: string[];
  budgetSpaces?: BudgetSpace[];
  onCreateCategory: (category: string) => string;
};

export function Movements({ selectedYm, onMonthChange, finance, customCategories = [], budgetSpaces = [], onCreateCategory }: Props) {
  const [editing, setEditing] = useState<Movement | null>(null);
  const [formType, setFormType] = useState<MovementType>("Gasto");
  const [category, setCategory] = useState("Mercado");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const categories = useMemo(
    () => [...new Set([...movementCategories, ...customCategories, ...finance.movements.map((movement) => movement.category)])],
    [customCategories, finance.movements],
  );
  const [categoryFilter, setCategoryFilter] = useState<"Todas" | MovementCategory>("Todas");
  const [typeFilter, setTypeFilter] = useState<"Todos" | MovementType>("Todos");
  const [formError, setFormError] = useState("");

  const visible = useMemo(() => {
    return finance.monthMovements.filter((movement) => {
      const categoryOk = categoryFilter === "Todas" || movement.category === categoryFilter;
      const typeOk = typeFilter === "Todos" || movement.type === typeFilter;
      return categoryOk && typeOk;
    });
  }, [categoryFilter, finance.monthMovements, typeFilter]);

  function assignedBudgetName(movement: Movement): string | undefined {
    if (movement.type !== "Gasto") return undefined;
    return budgetSpaces.find((space) => space.id === movement.budgetSpaceId)?.name
      ?? budgetSpaces.find((space) => space.category === movement.category)?.name;
  }

  async function submit(formData: FormData): Promise<boolean> {
    setFormError("");
    const amount = parseAmount(String(formData.get("amount") ?? ""));
    if (amount === null || amount <= 0) {
      setFormError("Introduce un importe válido mayor que cero. Puedes usar coma decimal.");
      return false;
    }
    const payload = {
      date: String(formData.get("date") || todayISO()),
      type: String(formData.get("type") || "Gasto") as MovementType,
      category: category as MovementCategory,
      budgetSpaceId: String(formData.get("budgetSpaceId") || "") || undefined,
      description: String(formData.get("description") || "").trim(),
      amountCents: toCents(amount),
    };

    if (editing) {
      await finance.updateMovement(editing.id, payload);
    } else {
      await finance.createMovement(payload);
    }
    setEditing(null);
    setFormType("Gasto");
    setCategory("Mercado");
    return true;
  }

  async function remove(id: string) {
    const movement = finance.movements.find((item) => item.id === id);
    const message = movement?.fixedPaymentId
      ? "¿Eliminar este movimiento? El cargo fijo asociado volverá a pendiente."
      : "¿Eliminar este movimiento?";
    if (confirm(message)) {
      await finance.removeMovement(id);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Movimientos</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresos y gastos variables en una sola tabla.</p>
      </div>

      <MonthSelector value={selectedYm} onChange={onMonthChange} label="Mes que estás consultando" />

      <Card>
        <h2 className="text-lg font-black text-slate-950">{editing ? "Editar movimiento" : "Nuevo movimiento"}</h2>
        <form
          key={editing?.id ?? "new-movement"}
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            void submit(new FormData(form)).then((saved) => { if (saved) form.reset(); }).catch((cause: unknown) => setFormError(cause instanceof Error ? cause.message : "No se pudo guardar el movimiento."));
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Fecha del movimiento</span><input className="input" name="date" type="date" defaultValue={editing?.date ?? todayISO()} readOnly={Boolean(editing?.fixedPaymentId)} required /></label>
            <select className="input" name="type" value={formType} disabled={Boolean(editing?.fixedPaymentId)} onChange={(event) => setFormType(event.target.value as MovementType)}>
              <option>Ingreso</option>
              <option>Gasto</option>
            </select>
          </div>
          <div className="block"><label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="movement-category">Categoría</label><select className="input" id="movement-category" name="category" value={category} disabled={Boolean(editing?.fixedPaymentId)} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><button className="mt-2 text-sm font-bold text-[#586b26]" type="button" onClick={() => setShowNewCategory((value) => !value)}>{showNewCategory ? "Cancelar nueva categoría" : "+ Crear categoría"}</button>{showNewCategory ? <div className="mt-2 flex gap-2"><input className="input min-w-0 flex-1" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nombre de la categoría" /><button className="btn-secondary shrink-0" type="button" onClick={() => { const saved = onCreateCategory(newCategory); if (saved) { setCategory(saved); setNewCategory(""); setShowNewCategory(false); } }}>Guardar</button></div> : null}</div>
          {formType === "Gasto" ? <label className="block"><span className="mb-1 block text-xs font-bold text-slate-400">Presupuesto asociado (opcional)</span><select className="input" name="budgetSpaceId" defaultValue={editing?.budgetSpaceId ?? ""}><option value="">Sin asignar</option>{budgetSpaces.filter((space) => !space.archived).map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label> : null}
          <input className="input" name="description" placeholder="Concepto o descripción" defaultValue={editing?.description ?? ""} required />
          <input className="input" name="amount" type="text" inputMode="decimal" placeholder="Importe (ej. 12,50)" defaultValue={editing ? fromCents(editing.amountCents) : ""} required />
          {formError ? <p role="alert" className="text-sm font-semibold text-rose-600">{formError}</p> : null}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" type="submit">
              {editing ? "Guardar cambios" : "Crear movimiento"}
            </button>
            {editing ? (
              <button className="btn-secondary" type="button" onClick={() => { setEditing(null); setFormType("Gasto"); setCategory("Mercado"); }}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
          <option>Todos</option>
          <option>Ingreso</option>
          <option>Gasto</option>
        </select>
        <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}>
          <option>Todas</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {visible.length > 0 ? (
          visible.map((movement) => (
            <Card key={movement.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{movement.description}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatLongDate(movement.date)} · {movement.category}
                  </p>
                  {assignedBudgetName(movement) ? <p className="mt-1 text-xs font-semibold text-slate-400">Presupuesto: {assignedBudgetName(movement)}</p> : null}
                </div>
                <p className={`font-black ${movement.type === "Ingreso" ? "text-emerald-600" : "text-slate-950"}`}>
                  {movement.type === "Ingreso" ? "+" : "-"}
                  {currency(fromCents(movement.amountCents))}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                  <button className="btn-secondary flex-1" type="button" onClick={() => { setEditing(movement); setFormType(movement.type); setCategory(movement.category); }}>
                  Editar
                </button>
                <button className="btn-danger flex-1" type="button" onClick={() => void remove(movement.id)}>
                  Eliminar
                </button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState title="Sin movimientos" body="Crea un ingreso o gasto para este mes." />
        )}
      </div>
    </div>
  );
}
