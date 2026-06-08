import { useState } from "react";
import type { MarketItem } from "../../types";
import { todayIso } from "../../utils/date";

type MarketItemFormProps = {
  initial?: MarketItem;
  onSubmit: (item: Omit<MarketItem, "id" | "createdAt">, id?: string) => Promise<void>;
  onDone: () => void;
};

export default function MarketItemForm({ initial, onSubmit, onDone }: MarketItemFormProps) {
  const [product, setProduct] = useState(initial?.product ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [lastPrice, setLastPrice] = useState(initial?.lastPrice.toString() ?? "");
  const [lastPurchaseDate, setLastPurchaseDate] = useState(initial?.lastPurchaseDate ?? todayIso());
  const [currentQty, setCurrentQty] = useState(initial?.currentQty.toString() ?? "0");
  const [minQty, setMinQty] = useState(initial?.minQty.toString() ?? "1");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(
      {
        product,
        category,
        lastPrice: Number(lastPrice),
        lastPurchaseDate,
        currentQty: Number(currentQty),
        minQty: Number(minQty),
      },
      initial?.id,
    );
    onDone();
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <label className="field">
        Producto
        <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ej. Leche" required />
      </label>
      <label className="field">
        Categoría
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Despensa, limpieza, carnes..." required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          Último precio
          <input value={lastPrice} onChange={(e) => setLastPrice(e.target.value)} type="number" min="0" step="0.01" required />
        </label>
        <label className="field">
          Fecha compra
          <input value={lastPurchaseDate} onChange={(e) => setLastPurchaseDate(e.target.value)} type="date" required />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="field">
          Cantidad actual
          <input value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} type="number" min="0" step="1" required />
        </label>
        <label className="field">
          Cantidad mínima
          <input value={minQty} onChange={(e) => setMinQty(e.target.value)} type="number" min="0" step="1" required />
        </label>
      </div>
      <button className="primary-button w-full" type="submit">
        Guardar producto
      </button>
    </form>
  );
}
