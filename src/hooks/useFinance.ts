import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createId,
  deleteFixedExpenseAndPayments,
  deleteFixedPayment,
  deleteItem,
  downloadBackup,
  exportBackup,
  getAll,
  importBackup,
  migrateLegacyMarketPurchasesOnce,
  putItem,
  saveMarketPurchaseBatch,
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
  MarketProduct,
  MarketPurchase,
  Movement,
  MovementCategory,
} from "../types/finance";
import { monthSummary } from "../lib/summary";

type FinanceState = {
  movements: Movement[];
  fixedExpenses: FixedExpense[];
  fixedPayments: FixedPayment[];
  products: MarketProduct[];
  purchases: MarketPurchase[];
};

const emptyState: FinanceState = {
  movements: [],
  fixedExpenses: [],
  fixedPayments: [],
  products: [],
  purchases: [],
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
    const [movements, fixedExpenses, fixedPayments, products, purchases] = await Promise.all([
      getAll("movements"),
      getAll("fixedExpenses"),
      getAll("fixedPayments"),
      getAll("products"),
      getAll("purchases"),
    ]);

    setState({
      movements: movements.sort((a, b) => b.date.localeCompare(a.date)),
      fixedExpenses: fixedExpenses.sort((a, b) => a.payDay - b.payDay),
      fixedPayments,
      products: products.sort((a, b) => a.product.localeCompare(b.product)),
      purchases: purchases.sort((a, b) => b.date.localeCompare(a.date)),
    });
  }, []);

  useEffect(() => {
    let mounted = true;
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
    const { income, fixedExpenses, variableExpenses, categoryData } = summary;
    const available = income - fixedExpenses - variableExpenses;

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
      available,
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
      const now = new Date().toISOString();
      await putItem("movements", {
        ...input,
        id: createId("mov"),
        createdAt: now,
        updatedAt: now,
      });
      await refresh();
    },
    [refresh],
  );

  const updateMovement = useCallback(
    async (id: string, input: MovementInput) => {
      const current = state.movements.find((item) => item.id === id);
      if (!current) return;
      await putItem("movements", {
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
      await deleteItem("movements", id);
      await refresh();
    },
    [refresh],
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
      await putItem("fixedPayments", {
        id: `${expenseId}__${selectedYm}`,
        expenseId,
        month: selectedYm,
        paidAt: todayISO(),
        amountCents: expense.amountCents,
      });
    }
    await refresh();
  }, [refresh, selectedYm, state.fixedExpenses, state.fixedPayments]);

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
      await refresh();
    },
    [refresh, state.products],
  );

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
    adjustProductQuantity,
    backup,
    restore,
  };
}
