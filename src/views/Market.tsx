import { useEffect, useMemo, useState } from "react";
import { Card, StatCard } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { MonthSelector } from "../components/MonthSelector";
import { formatLongDate, todayISO } from "../lib/date";
import { currency, numberValue } from "../lib/money";
import type { useFinance } from "../hooks/useFinance";
import type { MarketProduct, ProductCategory } from "../types/finance";
import { productCategories } from "../types/finance";

type Finance = ReturnType<typeof useFinance>;
type Tab = "comprar" | "inventario" | "historial";

type Props = {
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  finance: Finance;
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "comprar", label: "Comprar" },
  { id: "inventario", label: "Inventario" },
  { id: "historial", label: "Historial" },
];

const CHECKLIST_KEY = "finanzas-hogar-market-checklist-v1";

function suggestedQuantity(product: MarketProduct): number {
  return Math.max(1, Math.ceil(product.minQty - product.currentQty + 1));
}

function needsRestock(product: MarketProduct): boolean {
  return product.currentQty <= product.minQty;
}

export function Market({ selectedMonth, onMonthChange, finance }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("comprar");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MarketProduct | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"Todas" | ProductCategory>("Todas");
  const [checkedRestockIds, setCheckedRestockIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });

  const restock = useMemo(
    () => finance.products.filter((product) => needsRestock(product)),
    [finance.products],
  );

  const estimatedRestock = useMemo(
    () => restock.reduce((sum, product) => sum + suggestedQuantity(product) * product.lastPrice, 0),
    [restock],
  );

  const checkedRestockCount = restock.filter((product) => checkedRestockIds.has(product.id)).length;
  const pendingRestockCount = Math.max(0, restock.length - checkedRestockCount);

  const sortedRestock = useMemo(
    () =>
      [...restock].sort((a, b) => {
        const aChecked = checkedRestockIds.has(a.id) ? 1 : 0;
        const bChecked = checkedRestockIds.has(b.id) ? 1 : 0;
        return aChecked - bChecked || a.product.localeCompare(b.product);
      }),
    [checkedRestockIds, restock],
  );

  const filteredProducts = useMemo(() => {
    const search = inventorySearch.trim().toLocaleLowerCase("es-ES");
    return finance.products.filter((product) => {
      const matchesSearch =
        !search ||
        product.product.toLocaleLowerCase("es-ES").includes(search) ||
        product.category.toLocaleLowerCase("es-ES").includes(search);
      const matchesCategory = categoryFilter === "Todas" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, finance.products, inventorySearch]);

  useEffect(() => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify([...checkedRestockIds]));
  }, [checkedRestockIds]);

  useEffect(() => {
    const validIds = new Set(restock.map((product) => product.id));
    setCheckedRestockIds((current) => {
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [restock]);

  function openNewProduct() {
    setEditing(null);
    setShowForm((current) => !current);
  }

  async function submitProduct(formData: FormData) {
    const payload = {
      product: String(formData.get("product") || "").trim(),
      category: String(formData.get("category") || "Otros") as ProductCategory,
      lastPrice: numberValue(formData.get("lastPrice")),
      lastPurchaseDate: String(formData.get("lastPurchaseDate") || todayISO()),
      currentQty: numberValue(formData.get("currentQty")),
      minQty: numberValue(formData.get("minQty")),
    };

    if (!payload.product) return;

    if (editing) {
      await finance.updateProduct(editing.id, payload);
    } else {
      await finance.createProduct(payload);
    }

    setEditing(null);
    setShowForm(false);
  }

  async function submitPurchase(product: MarketProduct, formData: FormData) {
    const quantity = Math.max(1, numberValue(formData.get("quantity")));
    const price = numberValue(formData.get("price"));
    const priceMode = String(formData.get("priceMode") || "total") as "total" | "unit";
    await finance.markProductBought(product.id, price, quantity, priceMode);
    setCheckedRestockIds((current) => {
      const next = new Set(current);
      next.delete(product.id);
      return next;
    });
    setBuyingId(null);
  }

  async function submitConsumption(product: MarketProduct, formData: FormData) {
    const quantity = Math.max(1, Math.floor(numberValue(formData.get("quantity"))));
    await finance.adjustProductQuantity(product.id, -quantity);
    setConsumingId(null);
  }

  async function remove(id: string) {
    if (confirm("¿Eliminar este producto?")) {
      await finance.removeProduct(id);
    }
  }

  function toggleChecked(productId: string) {
    setCheckedRestockIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function ProductForm() {
    return (
      <Card>
        <h2 className="text-lg font-black text-slate-950">{editing ? "Editar producto" : "Nuevo producto"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Solo producto, categoría y cantidades son imprescindibles. Precio y fecha pueden quedar en cero/hoy.
        </p>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitProduct(new FormData(event.currentTarget));
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
            <input className="input" name="currentQty" type="number" step="1" min="0" placeholder="Cantidad actual" defaultValue={editing?.currentQty ?? ""} required />
            <input className="input" name="minQty" type="number" step="1" min="0" placeholder="Cantidad mínima" defaultValue={editing?.minQty ?? ""} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" name="lastPrice" type="number" step="0.01" min="0" placeholder="Último precio" defaultValue={editing?.lastPrice ?? 0} />
            <input className="input" name="lastPurchaseDate" type="date" defaultValue={editing?.lastPurchaseDate ?? todayISO()} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" type="submit">
              {editing ? "Guardar" : "Agregar"}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Card>
    );
  }

  function ProductCard({
    product,
    compact = false,
    checked = false,
  }: {
    product: MarketProduct;
    compact?: boolean;
    checked?: boolean;
  }) {
    const restockNeeded = needsRestock(product);
    const suggested = suggestedQuantity(product);

    return (
      <Card className={`p-3 transition ${checked ? "border-emerald-200 bg-emerald-50/70" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          {compact ? (
            <button
              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-lg font-black transition ${
                checked
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 bg-white text-transparent hover:border-slate-500"
              }`}
              type="button"
              onClick={() => toggleChecked(product.id)}
              aria-label={checked ? `Desmarcar ${product.product}` : `Marcar ${product.product}`}
            >
              ✓
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-black text-slate-950 ${checked ? "line-through decoration-2" : ""}`}>
                {product.product}
              </p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${restockNeeded ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                Reponer: {restockNeeded ? "Sí" : "No"}
              </span>
              {checked ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  En carrito
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {product.category} · última compra {formatLongDate(product.lastPurchaseDate)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Actual {product.currentQty} · mínimo {product.minQty}
              {restockNeeded ? ` · sugerido comprar ${suggested}` : ""}
            </p>
          </div>
          <p className="font-black text-slate-950">{currency(product.lastPrice)}</p>
        </div>

        {buyingId === product.id ? (
          <form
            className="mt-3 grid gap-2 rounded-2xl bg-blue-50 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPurchase(product, new FormData(event.currentTarget));
            }}
          >
            <p className="text-sm font-black text-blue-900">Registrar compra</p>
            <select className="input h-11" name="priceMode" defaultValue="total">
              <option value="total">Precio total / paquete</option>
              <option value="unit">Precio por unidad</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input h-11" name="quantity" type="number" min="1" step="1" defaultValue={suggested} placeholder="Cantidad" />
              <input className="input h-11" name="price" type="number" min="0" step="0.01" defaultValue={product.lastPrice} placeholder="Precio" />
            </div>
            <p className="text-xs font-semibold text-blue-700">
              Paquete: cantidad 10 y precio 2,50 = total 2,50. Unidad: cantidad 3 y precio 2,00 = total 6,00.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" type="submit">Confirmar</button>
              <button className="btn-secondary" type="button" onClick={() => setBuyingId(null)}>Cancelar</button>
            </div>
          </form>
        ) : null}

        {consumingId === product.id ? (
          <form
            className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitConsumption(product, new FormData(event.currentTarget));
            }}
          >
            <p className="text-sm font-black text-slate-900">Consumir unidades</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3].map((quantity) => (
                <button
                  key={quantity}
                  className="btn-secondary h-11 px-2"
                  type="button"
                  onClick={() => void finance.adjustProductQuantity(product.id, -quantity).then(() => setConsumingId(null))}
                >
                  -{quantity}
                </button>
              ))}
              <input className="input h-11 px-3" name="quantity" type="number" min="1" step="1" defaultValue={1} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" type="submit">Aplicar</button>
              <button className="btn-secondary" type="button" onClick={() => setConsumingId(null)}>Cancelar</button>
            </div>
          </form>
        ) : null}

        {!compact ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button className="btn-secondary" type="button" onClick={() => setConsumingId(product.id)}>
              Consumir
            </button>
            <button className="btn-primary" type="button" onClick={() => setBuyingId(product.id)}>
              Comprado
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                setEditing(product);
                setShowForm(true);
              }}
            >
              Editar
            </button>
            <button className="btn-danger" type="button" onClick={() => void remove(product.id)}>
              Eliminar
            </button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="btn-secondary" type="button" onClick={() => toggleChecked(product.id)}>
              {checked ? "Quitar" : "Marcar"}
            </button>
            <button className="btn-primary" type="button" onClick={() => setBuyingId(product.id)}>
              Comprado
            </button>
            <button className="btn-secondary" type="button" onClick={() => setActiveTab("inventario")}>
              Ver inventario
            </button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Mercado</h1>
          <p className="mt-1 text-sm text-slate-500">Compra, inventario e historial sin mezclar tareas.</p>
        </div>
        <button className="btn-primary shrink-0" type="button" onClick={openNewProduct}>
          + Producto
        </button>
      </div>

      <MonthSelector value={selectedMonth} onChange={onMonthChange} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pendientes" value={String(pendingRestockCount)} tone={pendingRestockCount ? "amber" : "green"} />
        <StatCard label="En carrito" value={String(checkedRestockCount)} tone="green" />
        <StatCard label="Estimado" value={currency(estimatedRestock)} tone="slate" />
      </div>

      <div className="grid grid-cols-3 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`h-11 rounded-xl text-sm font-black transition ${
              activeTab === tab.id ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showForm ? <ProductForm /> : null}

      {activeTab === "comprar" ? (
        <div className="space-y-3">
          {restock.length > 0 ? (
            <>
              <Card className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">Lista de compra</p>
                    <p className="text-sm text-slate-500">
                      Marca lo que ya pusiste en el carrito. Confirma `Comprado` al pagar.
                    </p>
                  </div>
                  <button className="btn-secondary shrink-0" type="button" onClick={() => setCheckedRestockIds(new Set())}>
                    Limpiar
                  </button>
                </div>
              </Card>
              {sortedRestock.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compact
                  checked={checkedRestockIds.has(product.id)}
                />
              ))}
            </>
          ) : (
            <EmptyState title="Nada por comprar" body="Cuando un producto llegue a su mínimo aparecerá aquí." />
          )}
        </div>
      ) : null}

      {activeTab === "inventario" ? (
        <div className="space-y-3">
          <Card className="p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
              <input
                className="input"
                value={inventorySearch}
                onChange={(event) => setInventorySearch(event.target.value)}
                placeholder="Buscar producto o categoría"
              />
              <select
                className="input"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as "Todas" | ProductCategory)}
              >
                <option>Todas</option>
                {productCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>
          </Card>

          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)
          ) : finance.products.length > 0 ? (
            <EmptyState title="Sin resultados" body="Cambia la búsqueda o el filtro de categoría." />
          ) : (
            <EmptyState title="Sin productos" body="Agrega tus productos frecuentes para controlar reposición." />
          )}
        </div>
      ) : null}

      {activeTab === "historial" ? (
        <Card>
          <h2 className="text-lg font-black text-slate-950">Historial de compras</h2>
          <div className="mt-3 space-y-2">
            {finance.monthPurchaseSummary.length > 0 ? (
              finance.monthPurchaseSummary.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <div>
                    <p className="font-bold text-slate-900">{purchase.product}</p>
                    <p className="text-sm text-slate-500">
                      {formatLongDate(purchase.date)} · {purchase.totalQuantity} uds
                      {purchase.count > 1 ? ` · ${purchase.count} compras` : ""}
                      {purchase.priceMode === "unit" && purchase.unitPrice
                        ? ` · ${currency(purchase.unitPrice)} c/u`
                        : ""}
                    </p>
                  </div>
                  <p className="font-black text-slate-950">{currency(purchase.price)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="Sin compras este mes" body="Las compras confirmadas aparecerán agrupadas por producto." />
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
