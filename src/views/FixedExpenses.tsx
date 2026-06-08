import { useState } from "react";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { formatLongDate, todayISO } from "../lib/date";
import { currency, numberValue } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { FixedExpense, FixedStatus } from "../types/finance";
import { fixedConcepts } from "../types/finance";

type Finance = ReturnType<typeof useFinance>;

type Props = {
  finance: Finance;
};

const alertClasses = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  yellow: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-rose-50 text-rose-700 ring-rose-100",
};

export function FixedExpenses({ finance }: Props) {
  const [editing, setEditing] = useState<FixedExpense | null>(null);

  async function submit(formData: FormData) {
    const payDay = Math.min(31, Math.max(1, numberValue(formData.get("payDay"))));
    const payload = {
      concept: String(formData.get("concept") || "").trim(),
      amount: numberValue(formData.get("amount")),
      payDay,
      dueDate: String(formData.get("dueDate") || todayISO()),
      status: String(formData.get("status") || "Pendiente") as FixedStatus,
    };

    if (editing) {
      await finance.updateFixedExpense(editing.id, payload);
    } else {
      await finance.createFixedExpense(payload);
    }
    setEditing(null);
  }

  async function remove(id: string) {
    if (confirm("¿Eliminar este gasto fijo?")) {
      await finance.removeFixedExpense(id);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Gastos fijos</h1>
        <p className="mt-1 text-sm text-slate-500">Pagos recurrentes y vencimientos visibles en el Dashboard.</p>
      </div>

      <Card>
        <h2 className="text-lg font-black text-slate-950">{editing ? "Editar gasto fijo" : "Nuevo gasto fijo"}</h2>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <input className="input" name="concept" list="fixed-concepts" placeholder="Concepto" defaultValue={editing?.concept ?? ""} required />
          <datalist id="fixed-concepts">
            {fixedConcepts.map((concept) => (
              <option key={concept} value={concept} />
            ))}
          </datalist>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" name="amount" type="number" step="0.01" min="0" placeholder="Monto" defaultValue={editing?.amount ?? ""} required />
            <input className="input" name="payDay" type="number" min="1" max="31" placeholder="Día de pago" defaultValue={editing?.payDay ?? ""} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" name="dueDate" type="date" defaultValue={editing?.dueDate ?? todayISO()} required />
            <select className="input" name="status" defaultValue={editing?.status ?? "Pendiente"}>
              <option>Pendiente</option>
              <option>Pagado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" type="submit">
              {editing ? "Guardar cambios" : "Crear gasto fijo"}
            </button>
            {editing ? (
              <button className="btn-secondary" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {finance.fixedForMonth.length > 0 ? (
          finance.fixedForMonth.map((expense) => (
            <Card key={expense.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{expense.concept}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Vence {formatLongDate(expense.dueDateForSelectedMonth)} · día {expense.payDay}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-950">{currency(expense.amount)}</p>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${alertClasses[expense.alert]}`}>
                    {expense.status === "Pagado"
                      ? "Pagado"
                      : expense.daysRemaining < 0
                        ? "Vencido"
                        : `${expense.daysRemaining} días`}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary flex-1" type="button" onClick={() => setEditing(expense)}>
                  Editar
                </button>
                <button className="btn-danger flex-1" type="button" onClick={() => void remove(expense.id)}>
                  Eliminar
                </button>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState title="Sin gastos fijos" body="Agrega renta, internet, servicios o cualquier pago recurrente." />
        )}
      </div>
    </div>
  );
}
