import { useEffect, useMemo, useRef, useState } from "react";
import { Card, StatCard } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { MonthSelector } from "../components/MonthSelector";
import { formatLongDate, todayISO } from "../lib/date";
import { currency, fromCents, numberValue, parseAmount, toCents } from "../lib/money";
import { getChecklistIds, saveChecklistIds } from "../lib/db";
import type { useFinance } from "../hooks/useFinance";
import type { MarketProduct, ProductCategory, ReceiptLine } from "../types/finance";
import { productCategories } from "../types/finance";
import { parseReceiptText, receiptLineAmountMismatch, ticketLinesMismatch, type ParsedReceipt } from "../lib/receiptParser";
import type { OcrProgress } from "../lib/receiptOcr";
import { validateReceiptFile } from "../lib/receiptImage";

type Finance = ReturnType<typeof useFinance>;
type Tab = "comprar" | "inventario" | "historial" | "tickets";

type Props = {
  selectedYm: string;
  onMonthChange: (ym: string) => void;
  finance: Finance;
};

function normalizeProductName(name: string): string {
  return name.trim().toLocaleLowerCase("es-ES").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "comprar", label: "Comprar" },
  { id: "inventario", label: "Inventario" },
  { id: "historial", label: "Historial" },
  { id: "tickets", label: "Tickets" },
];

function ReceiptScanner({ finance }: { finance: Finance }) {
  const [draft, setDraft] = useState<ParsedReceipt | null>(null);
  const [rawText, setRawText] = useState("");
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const scanningRef = useRef(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function scan(file?: File, input?: HTMLInputElement) {
    if (!file) return;
    if (scanningRef.current) { if (input) input.value = ""; return; }
    scanningRef.current = true;
    const fileError = validateReceiptFile(file);
    if (fileError) {
      setError(fileError);
      scanningRef.current = false;
      if (input) input.value = "";
      return;
    }
    setError("");
    setDraft(null);
    setRawText("");
    setScanning(true);
    setProgress({ status: "Preparando la foto", progress: 0 });
    try {
      const { recognizeReceipt } = await import("../lib/receiptOcr");
      const result = await recognizeReceipt(file, setProgress);
      const orderedText = result.lines.length ? result.lines.map((line) => line.text).join("\n") : result.text;
      setRawText(result.text);
      const parsed = parseReceiptText(orderedText, todayISO(), result.lines);
      setDraft({
        ...parsed,
        lines: parsed.lines.map((line) => {
          const product = finance.products.find((item) => normalizeProductName(item.product) === normalizeProductName(line.description));
          return product
            ? { ...line, inventoryAction: "update", productId: product.id, category: product.category }
            : { ...line, inventoryAction: "create" };
        }),
      });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
      setError(detail ? `No se pudo leer la imagen: ${detail}` : "No se pudo leer la imagen. Puedes volver a intentarlo.");
    } finally {
      setScanning(false);
      setProgress(null);
      scanningRef.current = false;
      if (input) input.value = "";
    }
  }

  function updateLine(index: number, changes: Partial<ReceiptLine>) {
    setDraft((current) => current ? {
      ...current,
      lines: current.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, ...changes };
        if (changes.quantity !== undefined || changes.unitPriceCents !== undefined) next.totalCents = Math.round(next.unitPriceCents * next.quantity);
        if (changes.totalCents !== undefined) next.unitPriceCents = next.quantity > 0 ? Math.round(next.totalCents / next.quantity) : 0;
        return next;
      }),
    } : current);
  }

  async function save(formData: FormData) {
    if (!draft || savingRef.current) return;
    const total = parseAmount(String(formData.get("receipt-total") ?? ""));
    const subtotalText = String(formData.get("receipt-subtotal") ?? "").trim();
    const taxText = String(formData.get("receipt-tax") ?? "").trim();
    const discountText = String(formData.get("receipt-discount") ?? "").trim();
    const subtotal = subtotalText ? parseAmount(subtotalText) : null;
    const tax = taxText ? parseAmount(taxText) : null;
    const discount = discountText ? parseAmount(discountText) : null;
    if (total === null || total <= 0 || (subtotalText && subtotal === null) || (taxText && tax === null)
      || (discountText && discount === null)
      || draft.lines.some((line) => !line.description.trim() || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isInteger(line.totalCents) || line.totalCents < 0)) {
      setError("Revisa el total y los importes antes de guardar.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await finance.saveTicket({
        storeName: String(formData.get("receipt-store") ?? "").trim(),
        date: String(formData.get("receipt-date") ?? ""),
        totalCents: toCents(total),
        subtotalCents: subtotal === null ? undefined : toCents(subtotal),
        taxCents: tax === null ? undefined : toCents(tax),
        discountCents: discount === null ? undefined : toCents(discount),
        lines: draft.lines,
        rawText,
      });
      setDraft(null);
      setRawText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el ticket.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <h2 className="text-lg font-black text-slate-950">Escanear un ticket</h2>
        <p className="mt-1 text-sm text-slate-500">El reconocimiento se procesa en este dispositivo. Revisa todos los datos antes de registrar la compra.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="btn-primary cursor-pointer text-center">
            Usar cámara
            <input className="sr-only" type="file" accept="image/*" capture="environment" disabled={scanning} onChange={(event) => { const input = event.currentTarget; void scan(input.files?.[0], input); }} />
          </label>
          <label className="btn-secondary cursor-pointer text-center">
            Elegir foto
            <input className="sr-only" type="file" accept="image/*" disabled={scanning} onChange={(event) => { const input = event.currentTarget; void scan(input.files?.[0], input); }} />
          </label>
        </div>
        {scanning && progress ? (
          <div className="mt-4" aria-live="polite">
            <div className="flex justify-between text-sm font-semibold text-slate-600"><span>{progress.status}</span><span>{Math.round(progress.progress * 100)}%</span></div>
            <progress className="mt-2 h-2 w-full accent-lime-500" max="1" value={progress.progress} />
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      </Card>

      {draft ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-lg font-black text-slate-950">Revisar ticket</h2><p className="text-sm text-slate-500">Nada se guarda hasta que confirmes.</p></div>
            <button className="btn-secondary" type="button" onClick={() => { setDraft(null); setRawText(""); }}>Descartar</button>
          </div>
          {draft.warnings.map((warning) => <p key={warning} className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{warning}</p>)}
          <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void save(new FormData(event.currentTarget)); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-slate-600">Comercio<input className="input" name="receipt-store" defaultValue={draft.storeName} required /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-600">Fecha<input className="input" name="receipt-date" type="date" defaultValue={draft.date} required /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-600">Total<input className="input" name="receipt-total" inputMode="decimal" defaultValue={draft.totalCents === undefined ? "" : fromCents(draft.totalCents)} required /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-600">Subtotal (opcional)<input className="input" name="receipt-subtotal" inputMode="decimal" defaultValue={draft.subtotalCents === undefined ? "" : fromCents(draft.subtotalCents)} /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-600">Impuestos (opcional)<input className="input" name="receipt-tax" inputMode="decimal" defaultValue={draft.taxCents === undefined ? "" : fromCents(draft.taxCents)} /></label>
              <label className="grid gap-1 text-sm font-bold text-slate-600">Descuentos (opcional)<input className="input" name="receipt-discount" inputMode="decimal" defaultValue={draft.discountCents === undefined ? "" : fromCents(draft.discountCents)} /></label>
            </div>
            <div className="flex items-center justify-between"><h3 className="font-black text-slate-900">Productos detectados</h3><button className="btn-secondary" type="button" onClick={() => setDraft((current) => current ? { ...current, lines: [...current.lines, { id: `manual_${crypto.randomUUID()}`, description: "", quantity: 1, unitPriceCents: 0, totalCents: 0, inventoryAction: "create", category: "Despensa" }] } : current)}>+ Añadir línea</button></div>
            {draft.lines.length ? draft.lines.map((line, index) => (
              <div key={line.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(10rem,1fr)_6rem_7rem_7rem_auto]">
                  <div className="col-span-2 sm:col-span-1"><input className="input w-full" aria-label="Producto del ticket" value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} required />{line.reviewRequired ? <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Revisar lectura{line.ocrConfidence === undefined ? "" : ` · ${line.ocrConfidence}%`}</span> : null}</div>
                  <input className="input min-w-0" aria-label="Cantidad" type="number" min="0.001" step="any" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} required />
                  <input className="input min-w-0" aria-label="Precio unitario" inputMode="decimal" value={fromCents(line.unitPriceCents)} onChange={(event) => { const amount = parseAmount(event.target.value); if (amount !== null) updateLine(index, { unitPriceCents: toCents(amount) }); }} required />
                  <input className="input min-w-0" aria-label="Importe de la línea" inputMode="decimal" value={fromCents(line.totalCents)} onChange={(event) => { const amount = parseAmount(event.target.value); if (amount !== null) updateLine(index, { totalCents: toCents(amount) }); }} required />
                  <button className="btn-danger col-span-2 sm:col-span-1" type="button" aria-label={`Quitar ${line.description || "línea"}`} onClick={() => setDraft((current) => current ? { ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) } : current)}>Quitar</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select className="input" aria-label="Acción de inventario" value={line.inventoryAction === "update" ? `update:${line.productId}` : line.inventoryAction} onChange={(event) => {
                    const value = event.target.value;
                    if (value === "create") updateLine(index, { inventoryAction: value, productId: undefined });
                    else { const product = finance.products.find((item) => item.id === value.slice(7)); if (product) updateLine(index, { inventoryAction: "update", productId: product.id, category: product.category }); }
                  }}>
                    <option value="create">Crear producto en inventario</option>
                    {finance.products.map((product) => <option key={product.id} value={`update:${product.id}`}>Sumar a {product.product}</option>)}
                  </select>
                  <select className="input" aria-label="Categoría de producto" value={line.category} onChange={(event) => updateLine(index, { category: event.target.value as ProductCategory })}>
                    {productCategories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
              </div>
            )) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No hay líneas detectadas. Puedes registrar el total y añadir productos manualmente.</p>}
            {draft.lines.some(receiptLineAmountMismatch) ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">En una o más líneas, cantidad × precio unitario no coincide con el importe. Revisa los tres valores; no se corregirán automáticamente.</p> : null}
            {draft.totalCents !== undefined && ticketLinesMismatch(draft.lines, draft.totalCents, draft.discountCents) ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">La suma de productos menos descuentos no coincide con el total. Comprueba el ticket; el gasto registrado será exactamente el total indicado.</p> : null}
            {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
            <button className="btn-primary w-full" type="submit" disabled={saving}>{saving ? "Guardando ticket…" : "Confirmar ticket"}</button>
          </form>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-black text-slate-950">Historial de tickets</h2>
        <div className="mt-3 space-y-2">
          {finance.tickets.length ? finance.tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-xl bg-slate-50 p-3">
              <button className="flex w-full items-center justify-between gap-3 text-left" type="button" onClick={() => setExpandedId((current) => current === ticket.id ? null : ticket.id)}>
                <span><strong className="block text-slate-900">{ticket.storeName}</strong><span className="text-sm text-slate-500">{formatLongDate(ticket.date)} · {ticket.lines.length} productos</span></span>
                <strong className="text-slate-950">{currency(fromCents(ticket.totalCents))}</strong>
              </button>
              {expandedId === ticket.id ? <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">{ticket.lines.map((line) => <p key={line.id} className="flex justify-between gap-3 text-slate-700"><span>{line.description} · {line.quantity} · {line.inventoryAction === "ignore" ? "solo ticket" : line.inventoryAction === "create" ? "añadido al inventario" : "inventario actualizado"}</span><span>{currency(fromCents(line.totalCents))}</span></p>)}{ticket.subtotalCents !== undefined ? <p className="flex justify-between border-t border-slate-200 pt-2 text-slate-500"><span>Subtotal</span><span>{currency(fromCents(ticket.subtotalCents))}</span></p> : null}{ticket.taxCents !== undefined ? <p className="flex justify-between text-slate-500"><span>Impuestos</span><span>{currency(fromCents(ticket.taxCents))}</span></p> : null}{ticket.discountCents ? <p className="flex justify-between text-emerald-700"><span>Descuentos</span><span>−{currency(fromCents(ticket.discountCents))}</span></p> : null}</div> : null}
            </div>
          )) : <EmptyState title="Sin tickets" body="Los tickets confirmados aparecerán aquí, con sus productos y total." />}
        </div>
      </Card>
    </div>
  );
}

function suggestedQuantity(product: MarketProduct): number {
  return Math.max(0.01, product.minQty - product.currentQty + 1);
}

function needsRestock(product: MarketProduct): boolean {
  return product.currentQty <= product.minQty;
}

export function Market({ selectedYm, onMonthChange, finance }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("comprar");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MarketProduct | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"Todas" | ProductCategory>("Todas");
  const [finalizing, setFinalizing] = useState(false);
  const [checkedRestockIds, setCheckedRestockIds] = useState<Set<string>>(new Set());
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const restock = useMemo(
    () => finance.products.filter((product) => needsRestock(product)),
    [finance.products],
  );

  const estimatedRestock = useMemo(
    () => restock.reduce((sum, product) => sum + suggestedQuantity(product) * fromCents(product.lastUnitPriceCents), 0),
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

  const checkedProducts = useMemo(
    () => restock.filter((product) => checkedRestockIds.has(product.id)),
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
    let active = true;
    void getChecklistIds().then((ids) => {
      if (active) { setCheckedRestockIds(new Set(ids)); setChecklistLoaded(true); setChecklistError(null); }
    }).catch((error: unknown) => {
      if (active) { setChecklistError(error instanceof Error ? error.message : "No se pudo leer la lista de reposición."); setChecklistLoaded(true); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!checklistLoaded) return;
    void saveChecklistIds([...checkedRestockIds]).then(() => setChecklistError(null)).catch((error: unknown) => {
      setChecklistError(error instanceof Error ? error.message : "No se pudo guardar la lista de reposición.");
    });
  }, [checklistLoaded, checkedRestockIds]);

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

  async function submitProduct(formData: FormData): Promise<boolean> {
    setFormError("");
    const priceText = String(formData.get("lastPrice") ?? "").trim();
    const lastPrice = priceText ? parseAmount(priceText) : 0;
    if (lastPrice === null) { setFormError("El último precio no tiene un formato válido."); return false; }
    const payload = {
      product: String(formData.get("product") || "").trim(),
      category: String(formData.get("category") || "Otros") as ProductCategory,
      lastUnitPriceCents: toCents(lastPrice),
      lastPurchaseDate: String(formData.get("lastPurchaseDate") || todayISO()),
      currentQty: numberValue(formData.get("currentQty")),
      minQty: numberValue(formData.get("minQty")),
    };

    if (!payload.product) return false;

    if (editing) {
      await finance.updateProduct(editing.id, payload);
    } else {
      await finance.createProduct(payload);
    }

    setEditing(null);
    setShowForm(false);
    return true;
  }

  async function submitPurchase(product: MarketProduct, formData: FormData) {
    const quantity = numberValue(formData.get("quantity"));
    const price = parseAmount(String(formData.get("price") ?? ""));
    if (!Number.isFinite(quantity) || quantity <= 0) { setFormError("La cantidad debe ser mayor que cero."); return; }
    if (price === null || price <= 0) { setFormError("Introduce un precio válido mayor que cero."); return; }
    setFormError("");
    const priceMode = String(formData.get("priceMode") || "total") as "total" | "unit";
    try { await finance.markProductBought(product.id, toCents(price), quantity, priceMode); }
    catch (error) { setFormError(error instanceof Error ? error.message : "No se pudo guardar la compra."); return; }
    setCheckedRestockIds((current) => {
      const next = new Set(current);
      next.delete(product.id);
      return next;
    });
    setBuyingId(null);
  }

  async function submitFinalPurchase(formData: FormData) {
    const items = checkedProducts.map((product) => ({
      productId: product.id,
      quantity: numberValue(formData.get(`quantity-${product.id}`)),
      price: parseAmount(String(formData.get(`price-${product.id}`) ?? "")),
      priceMode: String(formData.get(`priceMode-${product.id}`) || "total") as "total" | "unit",
    }));
    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) { setFormError("Todas las cantidades deben ser mayores que cero."); return; }
    if (items.some((item) => item.price === null || item.price <= 0)) { setFormError("Revisa los precios: cada uno debe ser mayor que cero."); return; }
    setFormError("");

    try { await finance.completeMarketPurchase(items.map((item) => ({ productId: item.productId, quantity: item.quantity, priceCents: toCents(item.price as number), priceMode: item.priceMode }))); }
    catch (error) { setFormError(error instanceof Error ? error.message : "No se pudieron guardar las compras."); return; }
    setCheckedRestockIds((current) => {
      const next = new Set(current);
      checkedProducts.forEach((product) => next.delete(product.id));
      return next;
    });
    setFinalizing(false);
  }

  async function submitConsumption(product: MarketProduct, formData: FormData) {
    const quantity = numberValue(formData.get("quantity"));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > product.currentQty) { setFormError("Introduce una cantidad positiva que no supere las existencias."); return; }
    setFormError("");
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
            const form = event.currentTarget;
            void submitProduct(new FormData(form)).then((saved) => { if (saved) form.reset(); });
          }}
        >
          <input className="input" name="product" placeholder="Producto" defaultValue={editing?.product ?? ""} required />
          <select className="input" name="category" defaultValue={editing?.category ?? "Despensa"}>
            {productCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" name="currentQty" type="number" step="any" min="0" placeholder="Cantidad actual" defaultValue={editing?.currentQty ?? ""} required />
            <input className="input" name="minQty" type="number" step="any" min="0" placeholder="Cantidad mínima" defaultValue={editing?.minQty ?? ""} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" name="lastPrice" type="text" inputMode="decimal" placeholder="Último precio (ej. 2,50)" defaultValue={fromCents(editing?.lastUnitPriceCents ?? 0)} />
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

  function FinalizePurchasePanel() {
    if (!finalizing) return null;

    if (checkedProducts.length === 0) {
      return (
        <Card className="p-3">
          <p className="font-black text-slate-950">No hay productos marcados</p>
          <p className="mt-1 text-sm text-slate-500">Marca productos en la lista para finalizar la compra.</p>
        </Card>
      );
    }

    return (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Finalizar compra</h2>
            <p className="mt-1 text-sm text-slate-500">
              Confirma cantidad, precio y si el precio es total o por unidad.
            </p>
          </div>
          <button className="btn-secondary shrink-0" type="button" onClick={() => setFinalizing(false)}>
            Cerrar
          </button>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitFinalPurchase(new FormData(event.currentTarget));
          }}
        >
          {checkedProducts.map((product) => {
            const suggested = suggestedQuantity(product);
            return (
              <div key={product.id} className="rounded-2xl bg-blue-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-blue-950">{product.product}</p>
                    <p className="text-sm text-blue-700">
                      Actual {product.currentQty} · mínimo {product.minQty} · sugerido {suggested}
                    </p>
                  </div>
                  <p className="font-black text-blue-950">{currency(fromCents(product.lastUnitPriceCents))}</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr]">
                  <input
                    className="input h-11"
                    name={`quantity-${product.id}`}
                    type="number"
                    min="0.01"
                    step="any"
                    defaultValue={suggested}
                    placeholder="Cantidad"
                    required
                  />
                  <input
                    className="input h-11"
                    name={`price-${product.id}`}
                    type="text"
                    inputMode="decimal"
                    defaultValue={product.lastUnitPriceCents > 0 ? fromCents(product.lastUnitPriceCents) : ""}
                    placeholder="Precio" required
                  />
                  <select className="input h-11" name={`priceMode-${product.id}`} defaultValue="total">
                    <option value="total">Precio total / paquete</option>
                    <option value="unit">Precio por unidad</option>
                  </select>
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary" type="submit">
              Confirmar compra
            </button>
            <button className="btn-secondary" type="button" onClick={() => setFinalizing(false)}>
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
          <p className="font-black text-slate-950">{currency(fromCents(product.lastUnitPriceCents))}</p>
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
              <input className="input h-11" name="quantity" type="number" min="0.01" step="any" defaultValue={suggested} placeholder="Cantidad" required />
              <input className="input h-11" name="price" type="text" inputMode="decimal" defaultValue={product.lastUnitPriceCents > 0 ? fromCents(product.lastUnitPriceCents) : ""} placeholder="Precio" required />
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
              <input className="input h-11 px-3" name="quantity" type="number" min="0.01" max={product.currentQty} step="any" defaultValue={1} required />
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
      {checklistError ? <p role="alert" className="rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200">{checklistError}</p> : null}
      {formError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</p> : null}

      <MonthSelector value={selectedYm} onChange={onMonthChange} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pendientes" value={String(pendingRestockCount)} tone={pendingRestockCount ? "amber" : "green"} />
        <StatCard label="En carrito" value={String(checkedRestockCount)} tone="green" />
        <StatCard label="Estimado" value={currency(estimatedRestock)} tone="slate" />
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:grid-cols-4">
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
                {checkedProducts.length > 0 ? (
                  <button className="btn-primary mt-3 w-full" type="button" onClick={() => setFinalizing(true)}>
                    Finalizar compra ({checkedProducts.length})
                  </button>
                ) : null}
              </Card>
              <FinalizePurchasePanel />
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
                      {purchase.priceMode === "unit" && purchase.unitPriceCents
                        ? ` · ${currency(fromCents(purchase.unitPriceCents))} c/u`
                        : ""}
                    </p>
                  </div>
                  <p className="font-black text-slate-950">{currency(fromCents(purchase.totalCents))}</p>
                </div>
              ))
            ) : (
              <EmptyState title="Sin compras este mes" body="Las compras confirmadas aparecerán agrupadas por producto." />
            )}
          </div>
        </Card>
      ) : null}

      {activeTab === "tickets" ? <ReceiptScanner finance={finance} /> : null}
    </div>
  );
}
