import { useState } from "react";
import type { Category, Movement, MovementType } from "../../types";
import { categories } from "../../hooks/useFinanceData";
import { todayIso } from "../../utils/date";

type MovementFormProps = {
  initial?: Movement;
  onSubmit: (movement: Omit<Movement, "id" | "createdAt">, id?: string) => Promise<void>;
  onDone: () => void;
};

export default function MovementForm({ initial, onSubmit, onDone }: MovementFormProps) {
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [type, setType] = useState<MovementType>(initial?.type ?? "Gasto");
  const [category, setCategory] = useState<Category>(initial?.category ?? "Mercado");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount.toString() ?? "");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ date, type, category, description, amount: Number(amount) }, initial?.id);
    onDone();
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          Fecha
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" required />
        </label>
        <label className="field">
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as MovementType)}>
            <option>Ingreso</option>
            <option>Gasto</option>
          </select>
        </label>
      </div>
      <label className="field">
        Categoría
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Descripción
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. compra semanal" required />
      </label>
      <label className="field">
        Monto
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" required />
      </label>
      <button className="primary-button w-full" type="submit">
        Guardar movimiento
      </button>
    </form>
  );
}
