import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createId,
  deleteItem,
  exportBackup,
  getAll,
  importBackup,
  putItem,
  seedIfEmpty,
} from "../lib/storage";
import {
  currentYear,
  daysUntil,
  dueDateForMonth,
  isSameMonth,
  statusColorByDays,
  todayISO,
} from "../lib/date";
import type {
  BackupPayload,
  FixedExpense,
  MarketProduct,
  MarketPurchase,
  Movement,
  MovementCategory,
} from "../types/finance";
import { movementCategories } from "../types/finance";

type FinanceState = {
  movements: Movement[];
  fixedExpenses: FixedExpense[];
  products: MarketProduct[];
  purchases: MarketPurchase[];
};

const emptyState: FinanceState = {
  movements: [],
  fixedExpenses: [],
  products: [],
  purchases: [],
};

type MovementInput = Omit<Movement, "id" | "createdAt" | "updatedAt">;
type FixedInput = Omit<FixedExpense, "id" | "createdAt" | "updatedAt">;
type ProductInput = Omit<MarketProduct, "id" | "createdAt" | "updatedAt">;

export function useFinance(selectedMonth: number) {
  const [state, setState] = useState<FinanceState>(emptyState);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [movements, fixedExpenses, products, purchases] = await Promise.all([
      getAll("movements"),
      getAll("fixedExpenses"),
      getAll("products"),
      getAll("purchases"),
    ]);

    setState({
      movements: movements.sort((a, b) => b.date.localeCompare(a.date)),
      fixedExpenses: fixedExpenses.sort((a, b) => a.payDay - b.payDay),
      products: products.sort((a, b) => a.product.localeCompare(b.product)),
      purchases: purchases.sort((a, b) => b.date.localeCompare(a.date)),
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      await seedIfEmpty();
      if (mounted) {
        await refresh();
        setLoading(false);
      }
    }
    void boot();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  const monthMovements = useMemo(
    () => state.movements.filter((item) => isSameMonth(item.date, selectedMonth)),
    [state.movements, selectedMonth],
  );

  const monthPurchases = useMemo(
    () => state.purchases.filter((item) => isSameMonth(item.date, selectedMonth)),
    [state.purchases, selectedMonth],
  );

  const fixedForMonth = useMemo(
    () =>
      state.fixedExpenses.map((expense) => {
        const date = expense.dueDate || dueDateForMonth(expense.payDay, selectedMonth);
        const days = daysUntil(date);
        return {
          ...expense,
          dueDateForSelectedMonth: date,
          daysRemaining: days,
          alert: statusColorByDays(days),
        };
      }),
    [state.fixedExpenses, selectedMonth],
  );

  const dashboard = useMemo(() => {
    const income = monthMovements
      .filter((item) => item.type === "Ingreso")
      .reduce((sum, item) => sum + item.amount, 0);
    const variableExpenses = monthMovements
      .filter((item) => item.type === "Gasto")
      .reduce((sum, item) => sum + item.amount, 0);
    const fixedExpenses = fixedForMonth.reduce((sum, item) => sum + item.amount, 0);
    const marketTotal = monthPurchases.reduce((sum, item) => sum + item.price, 0);
    const available = income - fixedExpenses - variableExpenses;
    const totalSpent = fixedExpenses + variableExpenses;

    const categoryData = movementCategories
      .filter((category) => category !== "Ropa")
      .map((category) => ({
        category,
        value: monthMovements
          .filter((item) => item.type === "Gasto" && item.category === category)
          .reduce((sum, item) => sum + item.amount, 0),
      }))
      .filter((item) => item.value > 0);

    const upcomingPayments = fixedForMonth
      .filter((item) => item.status === "Pendiente")
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);

    const restockProducts = state.products
      .filter((item) => item.currentQty <= item.minQty)
      .sort((a, b) => a.currentQty - b.currentQty);

    return {
      income,
      fixedExpenses,
      variableExpenses,
      marketTotal,
      available,
      totalSpent,
      categoryData,
      fixedVsVariable: [
        { name: "Fijos", value: fixedExpenses },
        { name: "Variables", value: variableExpenses },
      ],
      upcomingPayments,
      restockProducts,
    };
  }, [fixedForMonth, monthMovements, monthPurchases, state.products]);

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
      await deleteItem("fixedExpenses", id);
      await refresh();
    },
    [refresh],
  );

  const createProduct = useCallback(
    async (input: ProductInput) => {
      const now = new Date().toISOString();
      await putItem("products", {
        ...input,
        id: createId("prd"),
        createdAt: now,
        updatedAt: now,
      });
      await refresh();
    },
    [refresh],
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
    async (id: string, price?: number) => {
      const product = state.products.find((item) => item.id === id);
      if (!product) return;
      const now = new Date().toISOString();
      const purchasePrice = typeof price === "number" && price > 0 ? price : product.lastPrice;
      const updatedProduct: MarketProduct = {
        ...product,
        lastPrice: purchasePrice,
        lastPurchaseDate: todayISO(),
        currentQty: Math.max(product.currentQty + 1, product.minQty + 1),
        updatedAt: now,
      };
      const purchase: MarketPurchase = {
        id: createId("buy"),
        productId: product.id,
        product: product.product,
        price: purchasePrice,
        date: todayISO(),
        createdAt: now,
      };
      await Promise.all([putItem("products", updatedProduct), putItem("purchases", purchase)]);
      await refresh();
    },
    [refresh, state.products],
  );

  const backup = useCallback(async () => {
    const payload = await exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finanzas-hogar-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const restore = useCallback(
    async (payload: BackupPayload) => {
      await importBackup(payload);
      await refresh();
    },
    [refresh],
  );

  return {
    ...state,
    loading,
    monthMovements,
    monthPurchases,
    fixedForMonth,
    dashboard,
    createMovement,
    updateMovement,
    removeMovement,
    createFixedExpense,
    updateFixedExpense,
    removeFixedExpense,
    createProduct,
    updateProduct,
    removeProduct,
    markProductBought,
    backup,
    restore,
  };
}
