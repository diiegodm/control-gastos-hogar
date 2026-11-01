import { isSameMonth } from "./date";
import { movementCategories, type FixedExpense, type MarketPurchase, type Movement } from "../types/finance";

export type MonthSummary = {
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalSpent: number;
  categoryData: Array<{ category: string; value: number }>;
};

export function monthSummary(
  state: { movements: Movement[]; fixedExpenses: FixedExpense[]; purchases: MarketPurchase[] },
  ym: string,
): MonthSummary {
  const movements = state.movements.filter((item) => isSameMonth(item.date, ym));
  const purchases = state.purchases.filter((item) => isSameMonth(item.date, ym));
  const income = movements
    .filter((item) => item.type === "Ingreso")
    .reduce((sum, item) => sum + item.amount, 0);
  const movementExpenses = movements
    .filter((item) => item.type === "Gasto")
    .reduce((sum, item) => sum + item.amount, 0);
  const marketTotal = purchases.reduce((sum, item) => sum + item.price, 0);
  const fixedExpenses = state.fixedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const variableExpenses = movementExpenses + marketTotal;

  const categoriesWithActivity = [...new Set([
    ...movementCategories,
    ...movements.filter((item) => item.type === "Gasto").map((item) => item.category),
  ])];
  const categoryData = categoriesWithActivity
    .map((category) => ({
      category,
      value: movements
        .filter((item) => item.type === "Gasto" && item.category === category)
        .reduce((sum, item) => sum + item.amount, 0)
        + (category === "Mercado" ? marketTotal : 0),
    }))
    .filter((item) => item.value > 0);

  if (fixedExpenses > 0) categoryData.push({ category: "Gastos fijos", value: fixedExpenses });

  return {
    income,
    fixedExpenses,
    variableExpenses,
    totalSpent: fixedExpenses + variableExpenses,
    categoryData,
  };
}
