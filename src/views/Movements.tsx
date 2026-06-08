import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { MonthSelector } from "../components/MonthSelector";
import { formatLongDate, todayISO } from "../lib/date";
import { currency, numberValue } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { Movement, MovementCategory, MovementType } from "../types/finance";
import { movementCategories } from "../types/finance";

type Finance = ReturnType<typeof useFinance>;

type Props = {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  finance: Finance;
};

export function Movements({ selectedMonth, onMonthChange, finance }: Props) {
  const [editing, setEditing] = useState<Movement | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"Todas" | MovementCategory>("Todas");
  const [typeFilter, setTypeFilter] = useState<"Todos" | MovementType>("Todos");

  const visible = useMemo(() => {
    return finance.monthMovements.filter((movement) => {
      const categoryOk = categoryFilter === "Todas" || movement.category === categoryFilter;
      const typeOk = typeFilter === "Todos" || movement.type === typeFilter;
      return categoryOk && typeOk;
    });
  }, [categoryFilter, finance.monthMovements, typeFilter]);

  async function submit(formData: FormData) {
    const payload = {
      date: String(formData.get("date") || todayISO()),
      type: String(formData.get("type") || "Gasto") as MovementType,
      category: String(formData.get("category") || "Otros") as MovementCategory,
      description: String(formData.get("description") || "").trim(),
      amount: numberValue(formData.get("amount")),
    };

    if (editing) {
      await finance.updateMovement(editing.id, payload);
    } else {
      await finance.createMovement(payload);
    }
    setEditing(null);
  }

  async function remove(id: string) {
    if (confirm("¿Eliminar este movimiento?")) {
      await finance.removeMovement(id);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Movimientos</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresos y gastos variables en una sola tabla.</p>
      </div>

      <MonthSelector value={selectedMonth} onChange={onMonthChange} />

      <Card>
        <h2 className="text-lg font-black text-slate-950">{editing ? "Editar movimiento" : "Nuevo movimiento"}</h2>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <input className="input" name="date" type="date" defaultValue={editing?.date ?? todayISO()} required />
            <select className="input" name="type" defaultValue={editing?.type ?? "Gasto"}>
              <option>Ingreso</option>
              <option>Gasto</option>
            </select>
          </div>
          <select className="input" name="category" defaultValue={editing?.category ?? "Mercado"}>
            {movementCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <input className="input" name="description" placeholder="Descripción" defaultValue={editing?.description ?? ""} required />
          <input className="input" name="amount" type="number" min="0" step="0.01" placeholder="Monto" defaultValue={editing?.amount ?? ""} required />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" type="submit">
              {editing ? "Guardar cambios" : "Crear movimiento"}
            </button>
            {editing ? (
              <button className="btn-secondary" type="button" onClick={() => setEditing(null)}>
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
          {movementCategories.map((category) => (
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
                </div>
                <p className={`font-black ${movement.type === "Ingreso" ? "text-emerald-600" : "text-slate-950"}`}>
                  {movement.type === "Ingreso" ? "+" : "-"}
                  {currency(movement.amount)}
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary flex-1" type="button" onClick={() => setEditing(movement)}>
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
