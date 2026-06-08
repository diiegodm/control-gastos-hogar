import { useEffect, useMemo, useState } from "react";
import type { Category, FinanceData, FixedExpense, MarketItem, MarketPurchase, MonthKey, Movement } from "../types";
import { deleteItem, importAll, loadAll, putItem } from "../storage/db";
import { daysUntil, makeId, monthFromIso, todayIso } from "../utils/date";

export const categories: Category[] = ["Mercado", "Transporte", "Comidas", "Entretenimiento", "Salud", "Mascotas", "Ropa", "Otros"];

const emptyData: FinanceData = {
  movements: [],
  fixedExpenses: [],
  marketItems: [],
  marketPurchases: [],
};

export function useFinanceData(selectedMonth: MonthKey) {
  const [data, setData] = useState<FinanceData>(emptyData);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setData(await loadAll());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const monthMovements = useMemo(
    () => data.movements.filter((movement) => monthFromIso(movement.date) === selectedMonth),
    [data.movements, selectedMonth],
  );

  const income = useMemo(
    () => monthMovements.filter((item) => item.type === "Ingreso").reduce((sum, item) => sum + item.amount, 0),
    [monthMovements],
  );

  const variableExpenses = useMemo(
    () => monthMovements.filter((item) => item.type === "Gasto").reduce((sum, item) => sum + item.amount, 0),
    [monthMovements],
  );

  const fixedExpensesTotal = useMemo(() => data.fixedExpenses.reduce((sum, item) => sum + item.amount, 0), [data.fixedExpenses]);

  const marketTotal = useMemo(
    () =>
      monthMovements
        .filter((item) => item.type === "Gasto" && item.category === "Mercado")
        .reduce((sum, item) => sum + item.amount, 0),
    [monthMovements],
  );

  const categoryTotals = useMemo(
    () =>
      categories
        .filter((category) => category !== "Ropa")
        .map((category) => ({
          name: category,
          value: monthMovements
            .filter((item) => item.type === "Gasto" && item.category === category)
            .reduce((sum, item) => sum + item.amount, 0),
        })),
    [monthMovements],
  );

  const upcomingPayments = useMemo(
    () =>
      [...data.fixedExpenses]
        .map((item) => ({ ...item, days: daysUntil(item.dueDate) }))
        .sort((a, b) => a.days - b.days)
        .slice(0, 8),
    [data.fixedExpenses],
  );

  const restockItems = useMemo(() => data.marketItems.filter((item) => item.currentQty <= item.minQty), [data.marketItems]);

  const marketPurchasesThisMonth = useMemo(
    () => data.marketPurchases.filter((purchase) => monthFromIso(purchase.date) === selectedMonth),
    [data.marketPurchases, selectedMonth],
  );

  async function saveMovement(input: Omit<Movement, "id" | "createdAt">, id?: string) {
    const item = { ...input, id: id ?? makeId("mov"), createdAt: new Date().toISOString() };
    await putItem("movements", item);
    await refresh();
  }

  async function removeMovement(id: string) {
    await deleteItem("movements", id);
    await refresh();
  }

  async function saveFixedExpense(input: Omit<FixedExpense, "id" | "createdAt">, id?: string) {
    const item = { ...input, id: id ?? makeId("fix"), createdAt: new Date().toISOString() };
    await putItem("fixedExpenses", item);
    await refresh();
  }

  async function removeFixedExpense(id: string) {
    await deleteItem("fixedExpenses", id);
    await refresh();
  }

  async function saveMarketItem(input: Omit<MarketItem, "id" | "createdAt">, id?: string) {
    const item = { ...input, id: id ?? makeId("itm"), createdAt: new Date().toISOString() };
    await putItem("marketItems", item);
    await refresh();
  }

  async function removeMarketItem(id: string) {
    await deleteItem("marketItems", id);
    await refresh();
  }

  async function markPurchased(item: MarketItem, quantity: number, price: number) {
    const date = todayIso();
    const updated: MarketItem = {
      ...item,
      currentQty: item.currentQty + quantity,
      lastPrice: price,
      lastPurchaseDate: date,
      createdAt: item.createdAt,
    };
    const purchase: MarketPurchase = {
      id: makeId("buy"),
      itemId: item.id,
      product: item.product,
      price,
      quantity,
      date,
      createdAt: new Date().toISOString(),
    };
    const movement: Movement = {
      id: makeId("mov"),
      date,
      type: "Gasto",
      category: "Mercado",
      description: `Compra: ${item.product}`,
      amount: price,
      createdAt: new Date().toISOString(),
    };
    await putItem("marketItems", updated);
    await putItem("marketPurchases", purchase);
    await putItem("movements", movement);
    await refresh();
  }

  async function importBackup(imported: FinanceData) {
    await importAll(imported);
    await refresh();
  }

  return {
    data,
    loading,
    stats: {
      income,
      variableExpenses,
      fixedExpensesTotal,
      marketTotal,
      available: income - fixedExpensesTotal - variableExpenses,
    },
    monthMovements,
    categoryTotals,
    upcomingPayments,
    restockItems,
    marketPurchasesThisMonth,
    saveMovement,
    removeMovement,
    saveFixedExpense,
    removeFixedExpense,
    saveMarketItem,
    removeMarketItem,
    markPurchased,
    importBackup,
  };
}
