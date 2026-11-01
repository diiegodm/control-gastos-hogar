import { isSameMonth } from "./date";
import { movementCategories, type FixedExpense, type MarketPurchase, type Movement } from "../types/finance";
import { fromCents } from "./money";

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
    .reduce((sum, item) => sum + item.amountCents, 0);
  const movementExpenses = movements
    .filter((item) => item.type === "Gasto")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const marketTotal = purchases.reduce((sum, item) => sum + item.totalCents, 0);
  const fixedCents = state.fixedExpenses
    .filter((item) => item.startMonth <= ym && (!item.endMonth || ym <= item.endMonth))
    .reduce((sum, item) => sum + item.amountCents, 0);
  const fixedExpenses = fromCents(fixedCents);
  const variableExpenses = movementExpenses + marketTotal;

  const categoriesWithActivity = [...new Set([
    ...movementCategories,
    ...movements.filter((item) => item.type === "Gasto").map((item) => item.category),
  ])];
  const categoryData = categoriesWithActivity
    .map((category) => ({
      category,
      valueCents: movements
        .filter((item) => item.type === "Gasto" && item.category === category)
        .reduce((sum, item) => sum + item.amountCents, 0)
        + (category === "Mercado" ? marketTotal : 0),
    }))
    .filter((item) => item.valueCents > 0)
    .map(({ category, valueCents }) => ({ category, value: fromCents(valueCents) }));

  if (fixedExpenses > 0) categoryData.push({ category: "Gastos fijos", value: fixedExpenses });

  return {
    income: fromCents(income),
    fixedExpenses,
    variableExpenses: fromCents(variableExpenses),
    totalSpent: fromCents(fixedCents + variableExpenses),
    categoryData,
  };
}
