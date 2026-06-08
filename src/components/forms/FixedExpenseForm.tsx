import { useState } from "react";
import type { FixedExpense } from "../../types";
import { todayIso } from "../../utils/date";

type FixedExpenseFormProps = {
  initial?: FixedExpense;
  onSubmit: (expense: Omit<FixedExpense, "id" | "createdAt">, id?: string) => Promise<void>;
  onDone: () => void;
};

export default function FixedExpenseForm({ initial, onSubmit, onDone }: FixedExpenseFormProps) {
  const [concept, setConcept] = useState(initial?.concept ?? "");
  const [amount, setAmount] = useState(initial?.amount.toString() ?? "");
  const [paymentDay, setPaymentDay] = useState(initial?.paymentDay.toString() ?? "1");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? todayIso());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ concept, amount: Number(amount), paymentDay: Number(paymentDay), dueDate }, initial?.id);
    onDone();
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <label className="field">
        Concepto
        <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Internet" required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          Monto
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" required />
        </label>
        <label className="field">
          Día de pago
          <input value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} type="number" min="1" max="31" required />
        </label>
      </div>
      <label className="field">
        Fecha de vencimiento
        <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" required />
      </label>
      <button className="primary-button w-full" type="submit">
        Guardar gasto fijo
      </button>
    </form>
  );
}
