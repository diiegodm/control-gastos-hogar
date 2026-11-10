import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createId,
  awardMascotMission,
  awardMascotMovement,
  deleteFixedExpenseAndPayments,
  deleteFixedPayment,
  deleteItem,
  downloadBackup,
  exportBackup,
  getAll,
  getItem,
  importBackup,
  migrateLegacyMarketPurchasesOnce,
  putItem,
  saveFixedPaymentAndMovement,
  saveMarketPurchaseBatch,
  saveReceiptTicket,
  updateMovementAndFixedPayment,
  deleteMovementAndLinkedPayment,
} from "../lib/db";
import {
  daysUntil,
  dueDateForMonth,
  isSameMonth,
  statusColorByDays,
  todayISO,
} from "../lib/date";
import type {
  FixedExpense,
  FixedPayment,
  FinancialSettings,
  MarketProduct,
  MarketPurchase,
  Movement,
  MovementCategory,
  ReceiptLine,
  ReceiptTicket,
} from "../types/finance";
import { monthSummary } from "../lib/summary";
import { calculateCashBalance, resolveFinancialSettings } from "../lib/cashBalance";
import { currentMonthKey } from "../lib/mascot";
import { MASCOT_REWARDS } from "../types/mascot";

type FinanceState = {
  movements: Movement[];
  fixedExpenses: FixedExpense[];
  fixedPayments: FixedPayment[];
  products: MarketProduct[];
  purchases: MarketPurchase[];
  tickets: ReceiptTicket[];
  financialSettings: FinancialSettings;
};

const emptyState: FinanceState = {
  movements: [],
  fixedExpenses: [],
  fixedPayments: [],
  products: [],
  purchases: [],
  tickets: [],
  financialSettings: { openingBalanceCents: 0, trackingStartMonth: todayISO().slice(0, 7) },
};

type MovementInput = Omit<Movement, "id" | "createdAt" | "updatedAt">;
type FixedInput = Omit<FixedExpense, "id" | "createdAt" | "updatedAt">;
type ProductInput = Omit<MarketProduct, "id" | "createdAt" | "updatedAt">;
type PurchaseInput = {
  productId: string;
  priceCents: number;
  quantity: number;
  priceMode: "total" | "unit";
};

function normalizeProductName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function useFinance(selectedYm: string) {
  const [state, setState] = useState<FinanceState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const refresh = useCallback(async () => {
    const [movements, fixedExpenses, fixedPayments, products, purchases, tickets, settingsRecord] = await Promise.all([
      getAll("movements"),
      getAll("fixedExpenses"),
      getAll("fixedPayments"),
      getAll("products"),
      getAll("purchases"),
      getAll("tickets"),
      getItem("meta", "financialSettings"),
    ]);

    setState({
      movements: movements.sort((a, b) => b.date.localeCompare(a.date)),
      fixedExpenses: fixedExpenses.sort((a, b) => a.payDay - b.payDay),
      fixedPayments,
      products: products.sort((a, b) => a.product.localeCompare(b.product)),
      purchases: purchases.sort((a, b) => b.date.localeCompare(a.date)),
      tickets: tickets.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
      financialSettings: resolveFinancialSettings(settingsRecord?.value, movements, fixedPayments),
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const handleDataRestored = () => {
      void refresh().catch((error: unknown) => {
        if (mounted) setLoadError(error instanceof Error ? error.message : "No se pudieron actualizar los datos locales.");
      });
    };
    window.addEventListener("finance-data-restored", handleDataRestored);
    async function boot() {
      setLoading(true);
      setLoadError(null);
      try {
        if (typeof navigator !== "undefined") {
          try { await navigator.storage?.persist?.(); } catch { /* Persistence is best-effort. */ }
        }
        await migrateLegacyMarketPurchasesOnce();
        await refresh();
      } catch (error) {
        if (mounted) setLoadError(error instanceof Error ? error.message : "No se pudieron leer los datos locales.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void boot();
    return () => {
      mounted = false;
      window.removeEventListener("finance-data-restored", handleDataRestored);
    };
  }, [refresh, retryCount]);

  const retry = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    setRetryCount((count) => count + 1);
  }, []);

  const monthMovements = useMemo(
    () => state.movements.filter((item) => isSameMonth(item.date, selectedYm)),
    [state.movements, selectedYm],
  );

  const monthPurchases = useMemo(
    () => state.purchases.filter((item) => isSameMonth(item.date, selectedYm)),
    [state.purchases, selectedYm],
  );

  const monthPurchaseSummary = useMemo(() => {
    const grouped = new Map<string, MarketPurchase & { count: number; totalQuantity: number }>();

    for (const purchase of monthPurchases) {
      const key = normalizeProductName(purchase.product);
      const quantity = purchase.quantity ?? 1;
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, { ...purchase, count: 1, totalQuantity: quantity });
        continue;
      }

      grouped.set(key, {
        ...current,
        totalCents: current.totalCents + purchase.totalCents,
        count: current.count + 1,
        totalQuantity: current.totalQuantity + quantity,
        date: purchase.date > current.date ? purchase.date : current.date,
      });
    }

    return [...grouped.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [monthPurchases]);

  const fixedForMonth = useMemo(
    () =>
      state.fixedExpenses.map((expense) => {
        if (expense.startMonth > selectedYm || (expense.endMonth && selectedYm > expense.endMonth)) return null;
        const date = dueDateForMonth(expense.payDay, selectedYm);
        const days = daysUntil(date);
        const payment = state.fixedPayments.find((entry) => entry.expenseId === expense.id && entry.month === selectedYm);
        return {
          ...expense,
          dueDateForSelectedMonth: date,
          daysRemaining: days,
          alert: statusColorByDays(days),
          isPaid: Boolean(payment),
          paymentId: payment?.id,
        };
      }).filter((expense) => expense !== null),
    [state.fixedExpenses, state.fixedPayments, selectedYm],
  );

  const dashboard = useMemo(() => {
    const summary = monthSummary(state, selectedYm);
    const { income, fixedExpenses, variableExpenses, goalContributions, categoryData } = summary;
    const cashBalance = calculateCashBalance({
      movements: state.movements,
      fixedPayments: state.fixedPayments,
      fixedExpenses: state.fixedExpenses,
      settings: state.financialSettings,
      selectedMonth: selectedYm,
    });
    const monthlyResult = cashBalance.monthlyResultCents / 100;
    const inheritedBalance = cashBalance.inheritedBalanceCents / 100;
    const available = cashBalance.availableBalanceCents === null ? null : cashBalance.availableBalanceCents / 100;

    const upcomingPayments = fixedForMonth
      .filter((item) => !item.isPaid)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);

    const restockProducts = state.products
      .filter((item) => item.currentQty <= item.minQty)
      .sort((a, b) => a.currentQty - b.currentQty);

    return {
      income,
      fixedExpenses,
      variableExpenses,
      goalContributions,
      available,
      monthlyResult,
      inheritedBalance,
      trackingStarted: cashBalance.trackingStarted,
      possibleDuplicatePayments: cashBalance.possibleDuplicatePayments,
      totalSpent: summary.totalSpent,
      categoryData,
      fixedVsVariable: [
        { name: "Fijos", value: fixedExpenses },
        { name: "Variables", value: variableExpenses },
      ],
      upcomingPayments,
      restockProducts,
    };
  }, [fixedForMonth, monthMovements, monthPurchases, selectedYm, state]);

  const summary = useMemo(() => monthSummary(state, selectedYm), [state, selectedYm]);

  const createMovement = useCallback(
    async (input: MovementInput) => {
      if (input.type === "Gasto") {
        const matchesPaidFixed = state.fixedPayments.some((payment) => {
          if (payment.month !== input.date.slice(0, 7) || payment.amountCents !== input.amountCents) return false;
          const expense = state.fixedExpenses.find((item) => item.id === payment.expenseId);
          if (!expense || (expense.category && expense.category !== input.category)) return false;
          return normalizeProductName(expense.concept) === normalizeProductName(input.description);
        });
        if (matchesPaidFixed) throw new Error("Este cargo fijo ya está registrado como pagado este mes. No lo añadas otra vez en Movimientos.");
      }
      const now = new Date().toISOString();
      const movement: Movement = {
        ...input,
        id: createId("mov"),
        createdAt: now,
        updatedAt: now,
      };
      await putItem("movements", movement);
      try { await awardMascotMovement(movement.id); } catch { /* El fallo de la recompensa nunca bloquea el movimiento. */ }
      await refresh();
    },
    [refresh, state.fixedExpenses, state.fixedPayments],
  );

  const updateMovement = useCallback(
    async (id: string, input: MovementInput) => {
      const current = state.movements.find((item) => item.id === id);
      if (!current) return;
      await updateMovementAndFixedPayment({
        ...current,
        ...input,
        updatedAt: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh, state.movements],
  );

  const removeMovement = useCallback(
    async (id: string) => {
      const current = state.movements.find((item) => item.id === id);
      if (!current) return;
      await deleteMovementAndLinkedPayment(current);
      await refresh();
    },
    [refresh, state.movements],
  );

  const createFixedExpense = useCallback(
    async (input: FixedInput) => {
      const now = new Date().toISOString();
      await putItem("fixedExpenses", {
        ...input,
        id: createId("fix"),
        createdAt: now,
        updatedAt: now,
      });
      try { await awardMascotMission(`mission:fixed-organized:${currentMonthKey()}`, MASCOT_REWARDS.monthlyFixedSetup, "Gastos fijos organizados"); } catch { /* La recompensa es secundaria al gasto. */ }
      await refresh();
    },
    [refresh],
  );

  const updateFixedExpense = useCallback(
    async (id: string, input: FixedInput) => {
      const current = state.fixedExpenses.find((item) => item.id === id);
      if (!current) return;
      await putItem("fixedExpenses", {
        ...current,
        ...input,
        updatedAt: new Date().toISOString(),
      });
      try { await awardMascotMission(`mission:fixed-organized:${currentMonthKey()}`, MASCOT_REWARDS.monthlyFixedSetup, "Gastos fijos organizados"); } catch { /* La recompensa es secundaria al gasto. */ }
      await refresh();
    },
    [refresh, state.fixedExpenses],
  );

  const removeFixedExpense = useCallback(
    async (id: string) => {
      await deleteFixedExpenseAndPayments(id);
      await refresh();
    },
    [refresh],
  );

  const markFixedPaid = useCallback(async (expenseId: string) => {
    const existing = state.fixedPayments.find((payment) => payment.expenseId === expenseId && payment.month === selectedYm);
    if (existing) await deleteFixedPayment(expenseId, selectedYm);
    else {
      const expense = state.fixedExpenses.find((item) => item.id === expenseId);
      if (!expense) return;
      const paymentId = `${expenseId}__${selectedYm}`;
      const candidates = state.movements.filter((movement) =>
        movement.type === "Gasto" && movement.date.startsWith(selectedYm) && movement.amountCents === expense.amountCents
        && normalizeProductName(movement.description) === normalizeProductName(expense.concept)
        && (!expense.category || movement.category === expense.category) && !movement.fixedPaymentId,
      );
      if (candidates.length > 1) throw new Error("Hay varios movimientos iguales a este cargo. Revisa el historial antes de marcarlo como pagado.");
      const now = new Date().toISOString();
      const linkedMovement = candidates[0] ?? {
        id: `fixed_${paymentId}`,
        date: dueDateForMonth(expense.payDay, selectedYm),
        type: "Gasto" as const,
        category: expense.category ?? "Otros",
        description: expense.concept,
        amountCents: expense.amountCents,
        createdAt: now,
        updatedAt: now,
        generatedByFixedPayment: true,
      };
      const movement = { ...linkedMovement, fixedPaymentId: paymentId, updatedAt: now };
      await saveFixedPaymentAndMovement({
        id: paymentId,
        expenseId,
        month: selectedYm,
        paidAt: todayISO(),
        amountCents: expense.amountCents,
        movementId: movement.id,
      }, movement);
      try { await awardMascotMovement(movement.id); } catch { /* La recompensa no afecta el registro del pago. */ }
    }
    await refresh();
  }, [refresh, selectedYm, state.fixedExpenses, state.fixedPayments, state.movements]);

  const updateFinancialSettings = useCallback(async (settings: FinancialSettings) => {
    await putItem("meta", { key: "financialSettings", value: settings });
    await refresh();
  }, [refresh]);

  const createProduct = useCallback(
    async (input: ProductInput) => {
      const now = new Date().toISOString();
      const existing = state.products.find(
        (product) => normalizeProductName(product.product) === normalizeProductName(input.product),
      );

      if (existing) {
        await putItem("products", {
          ...existing,
          ...input,
          currentQty: input.currentQty,
          minQty: input.minQty,
          updatedAt: now,
        });
        await refresh();
        return;
      }

      await putItem("products", {
        ...input,
        id: createId("prd"),
        createdAt: now,
        updatedAt: now,
      });
      await refresh();
    },
    [refresh, state.products],
  );

  const updateProduct = useCallback(
    async (id: string, input: ProductInput) => {
      const current = state.products.find((item) => item.id === id);
      if (!current) return;
      await putItem("products", {
        ...current,
        ...input,
        updatedAt: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh, state.products],
  );

  const removeProduct = useCallback(
    async (id: string) => {
      await deleteItem("products", id);
      await refresh();
    },
    [refresh],
  );

  const markProductBought = useCallback(
    async (id: string, priceCents?: number, quantity = 1, priceMode: "total" | "unit" = "total") => {
      const product = state.products.find((item) => item.id === id);
      if (!product) return;
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("La cantidad debe ser mayor que cero.");
      if (!Number.isInteger(priceCents) || !priceCents || priceCents <= 0) throw new Error("Introduce un precio válido mayor que cero.");
      const now = new Date().toISOString();
      const purchasedQty = quantity;
      const enteredPrice = priceCents;
      const unitPriceCents = priceMode === "unit" ? enteredPrice : Math.round(enteredPrice / purchasedQty);
      const purchaseTotal = priceMode === "unit" ? Math.round(enteredPrice * purchasedQty) : enteredPrice;
      const updatedProduct: MarketProduct = {
        ...product,
        lastUnitPriceCents: unitPriceCents,
        lastPurchaseDate: todayISO(),
        currentQty: product.currentQty + purchasedQty,
        updatedAt: now,
      };
      const purchase: MarketPurchase = {
        id: createId("buy"),
        productId: product.id,
        product: product.product,
        totalCents: purchaseTotal,
        quantity: purchasedQty,
        unitPriceCents,
        priceMode,
        date: todayISO(),
        createdAt: now,
      };
      const movement: Movement = {
        id: `market_${purchase.id}`, date: purchase.date, type: "Gasto", category: "Mercado",
        description: `Compra: ${product.product}`, amountCents: purchaseTotal,
        source: "market", purchaseId: purchase.id, createdAt: now, updatedAt: now,
      };
      await saveMarketPurchaseBatch([updatedProduct], [purchase], [movement]);
      try { await awardMascotMovement(movement.id); } catch { /* La recompensa no afecta la compra. */ }
      await refresh();
    },
    [refresh, state.products],
  );

  const completeMarketPurchase = useCallback(
    async (items: PurchaseInput[]) => {
      const now = new Date().toISOString();
      const productById = new Map(state.products.map((product) => [product.id, product]));

      if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isInteger(item.priceCents) || item.priceCents <= 0)) {
        throw new Error("Cada producto necesita una cantidad y un precio mayores que cero.");
      }
      if (items.some((item) => !productById.has(item.productId))) throw new Error("Uno de los productos ya no existe. Actualiza el inventario e inténtalo otra vez.");

      const updates = items
        .map((item) => {
          const product = productById.get(item.productId);
          if (!product) return null;

          const purchasedQty = item.quantity;
          const enteredPrice = item.priceCents;
          const unitPriceCents = item.priceMode === "unit" ? enteredPrice : Math.round(enteredPrice / purchasedQty);
          const purchaseTotal = item.priceMode === "unit" ? Math.round(enteredPrice * purchasedQty) : enteredPrice;

          const updatedProduct: MarketProduct = {
            ...product,
            lastUnitPriceCents: unitPriceCents,
            lastPurchaseDate: todayISO(),
            currentQty: product.currentQty + purchasedQty,
            updatedAt: now,
          };

          const purchase: MarketPurchase = {
            id: createId("buy"),
            productId: product.id,
            product: product.product,
            totalCents: purchaseTotal,
            quantity: purchasedQty,
            unitPriceCents,
            priceMode: item.priceMode,
            date: todayISO(),
            createdAt: now,
          };

          const movement: Movement = {
            id: `market_${purchase.id}`, date: purchase.date, type: "Gasto", category: "Mercado",
            description: `Compra: ${product.product}`, amountCents: purchaseTotal,
            source: "market", purchaseId: purchase.id, createdAt: now, updatedAt: now,
          };
          return { updatedProduct, purchase, movement };
        })
        .filter((item): item is { updatedProduct: MarketProduct; purchase: MarketPurchase; movement: Movement } => item !== null);

      await saveMarketPurchaseBatch(
        updates.map(({ updatedProduct }) => updatedProduct),
        updates.map(({ purchase }) => purchase),
        updates.map(({ movement }) => movement),
      );
      for (const { movement } of updates) {
        try { await awardMascotMovement(movement.id); } catch { /* La recompensa no afecta la compra. */ }
      }
      await refresh();
    },
    [refresh, state.products],
  );

  const saveTicket = useCallback(async (input: {
    storeName: string;
    date: string;
    totalCents: number;
    subtotalCents?: number;
    taxCents?: number;
    lines: ReceiptLine[];
    rawText: string;
  }) => {
    if (!Number.isInteger(input.totalCents) || input.totalCents <= 0) throw new Error("El total del ticket debe ser mayor que cero.");
    const id = createId("ticket");
    const now = new Date().toISOString();
    const byName = new Map(state.products.map((product) => [normalizeProductName(product.product), product]));
    const updates = new Map<string, MarketProduct>();
    const purchases: MarketPurchase[] = [];
    const lines = input.lines.map((line) => {
      const existing = (line.productId ? state.products.find((product) => product.id === line.productId) : undefined)
        ?? byName.get(normalizeProductName(line.description));
      const current = existing ? (updates.get(existing.id) ?? existing) : undefined;
      const productId = current?.id ?? createId("prd");
      const next: MarketProduct = current
        ? {
            ...current,
            category: line.category,
            lastUnitPriceCents: line.unitPriceCents,
            lastPurchaseDate: input.date,
            currentQty: current.currentQty + line.quantity,
            updatedAt: now,
          }
        : {
            id: productId,
            product: line.description.trim(),
            category: line.category,
            lastUnitPriceCents: line.unitPriceCents,
            lastPurchaseDate: input.date,
            currentQty: line.quantity,
            minQty: 0,
            createdAt: now,
            updatedAt: now,
          };
      updates.set(productId, next);
      byName.set(normalizeProductName(next.product), next);
      const savedLine = { ...line, inventoryAction: current ? "update" as const : "create" as const, productId };
      purchases.push({
        id: createId("buy"),
        productId,
        product: next.product,
        totalCents: line.totalCents,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        priceMode: "total",
        date: input.date,
        createdAt: now,
      });
      return savedLine;
    });
    const movementId = `ticket_${id}`;
    const ticket: ReceiptTicket = {
      id,
      storeName: input.storeName.trim() || "Comercio",
      date: input.date,
      totalCents: input.totalCents,
      subtotalCents: input.subtotalCents,
      taxCents: input.taxCents,
      lines,
      rawText: input.rawText,
      movementId,
      createdAt: now,
    };
    const movement: Movement = {
      id: movementId,
      date: input.date,
      type: "Gasto",
      category: "Mercado",
      description: `Compra en ${ticket.storeName}`,
      amountCents: input.totalCents,
      source: "ticket",
      ticketId: id,
      createdAt: now,
      updatedAt: now,
    };
    await saveReceiptTicket(ticket, movement, [...updates.values()], purchases);
    try { await awardMascotMovement(movement.id); } catch { /* La recompensa no afecta el ticket. */ }
    await refresh();
  }, [refresh, state.products]);

  const adjustProductQuantity = useCallback(
    async (id: string, delta: number) => {
      const product = state.products.find((item) => item.id === id);
      if (!product) return;
      await putItem("products", {
        ...product,
        currentQty: Math.max(0, product.currentQty + delta),
        updatedAt: new Date().toISOString(),
      });
      await refresh();
    },
    [refresh, state.products],
  );

  const backup = useCallback(async () => {
    const payload = await exportBackup();
    downloadBackup(payload);
  }, []);

  const restore = useCallback(
    async (payload: unknown) => {
      await importBackup(payload);
      await refresh();
    },
    [refresh],
  );

  return {
    ...state,
    loading,
    loadError,
    retry,
    monthMovements,
    monthPurchases,
    monthPurchaseSummary,
    fixedForMonth,
    selectedYm,
    dashboard,
    financialSettings: state.financialSettings,
    updateFinancialSettings,
    summary,
    createMovement,
    updateMovement,
    removeMovement,
    createFixedExpense,
    updateFixedExpense,
    removeFixedExpense,
    markFixedPaid,
    createProduct,
    updateProduct,
    removeProduct,
    markProductBought,
    completeMarketPurchase,
    saveTicket,
    adjustProductQuantity,
    backup,
    restore,
  };
}
