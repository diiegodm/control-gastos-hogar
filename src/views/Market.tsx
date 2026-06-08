import { useMemo, useState } from "react";
import { Card, StatCard } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { MonthSelector } from "../components/MonthSelector";
import { formatLongDate, todayISO } from "../lib/date";
import { currency, numberValue } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { MarketProduct, ProductCategory } from "../types/finance";
import { productCategories } from "../types/finance";

type Finance = ReturnType<typeof useFinance>;

type Props = {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  finance: Finance;
};

export function Market({ selectedMonth, onMonthChange, finance }: Props) {
  const [editing, setEditing] = useState<MarketProduct | null>(null);
  const restock = useMemo(
    () => finance.products.filter((product) => product.currentQty <= product.minQty),
    [finance.products],
  );

  async function submit(formData: FormData) {
    const payload = {
      product: String(formData.get("product") || "").trim(),
      category: String(formData.get("category") || "Otros") as ProductCategory,
      lastPrice: numberValue(formData.get("lastPrice")),
      lastPurchaseDate: String(formData.get("lastPurchaseDate") || todayISO()),
      currentQty: numberValue(formData.get("currentQty")),
      minQty: numberValue(formData.get("minQty")),
    };

    if (editing) {
      await finance.updateProduct(editing.id, payload);
    } else {
      await finance.createProduct(payload);
    }
    setEditing(null);
  }

  async function remove(id: string) {
    if (confirm("¿Eliminar este producto?")) {
      await finance.removeProduct(id);
    }
  }

  async function markBought(product: MarketProduct) {
    const value = prompt("Precio pagado", String(product.lastPrice));
    if (value === null) return;
    await finance.markProductBought(product.id, Number(value.replace(",", ".")));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Mercado</h1>
        <p className="mt-1 text-sm text-slate-500">Inventario básico, compras y productos por reponer.</p>
      </div>

      <MonthSelector value={selectedMonth} onChange={onMonthChange} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Mercado este mes" value={currency(finance.dashboard.marketTotal)} tone="blue" />
        <StatCard label="Por reponer" value={String(restock.length)} detail="productos" tone={restock.length ? "amber" : "green"} />
      </div>

      <Card>
        <h2 className="text-lg font-black text-slate-950">{editing ? "Editar producto" : "Agregar producto"}</h2>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <input className="input" name="product" placeholder="Producto" defaultValue={editing?.product ?? ""} required />
          <select className="input" name="category" defaultValue={editing?.category ?? "Despensa"}>
            {productCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" name="lastPrice" type="number" step="0.01" min="0" placeholder="Último precio" defaultValue={editing?.lastPrice ?? ""} required />
            <input className="input" name="lastPurchaseDate" type="date" defaultValue={editing?.lastPurchaseDate ?? todayISO()} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" name="currentQty" type="number" step="1" min="0" placeholder="Cantidad actual" defaultValue={editing?.currentQty ?? ""} required />
            <input className="input" name="minQty" type="number" step="1" min="0" placeholder="Cantidad mínima" defaultValue={editing?.minQty ?? ""} required />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" type="submit">
              {editing ? "Guardar cambios" : "Agregar producto"}
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
        {finance.products.length > 0 ? (
          finance.products.map((product) => {
            const needsRestock = product.currentQty <= product.minQty;
            return (
              <Card key={product.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{product.product}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${needsRestock ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        Reponer: {needsRestock ? "Sí" : "No"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.category} · última compra {formatLongDate(product.lastPurchaseDate)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Cantidad {product.currentQty} · mínimo {product.minQty}
                    </p>
                  </div>
                  <p className="font-black text-slate-950">{currency(product.lastPrice)}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button className="btn-primary" type="button" onClick={() => void markBought(product)}>
                    Comprado
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => setEditing(product)}>
                    Editar
                  </button>
                  <button className="btn-danger" type="button" onClick={() => void remove(product.id)}>
                    Eliminar
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState title="Sin productos" body="Agrega los productos que quieres controlar." />
        )}
      </div>

      <Card>
        <h2 className="text-lg font-black text-slate-950">Historial de compras</h2>
        <div className="mt-3 space-y-2">
          {finance.monthPurchases.length > 0 ? (
            finance.monthPurchases.slice(0, 8).map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <div>
                  <p className="font-bold text-slate-900">{purchase.product}</p>
                  <p className="text-sm text-slate-500">{formatLongDate(purchase.date)}</p>
                </div>
                <p className="font-black text-slate-950">{currency(purchase.price)}</p>
              </div>
            ))
          ) : (
            <EmptyState title="Sin compras este mes" body="Marca productos como comprados para crear historial." />
          )}
        </div>
      </Card>
    </div>
  );
}
